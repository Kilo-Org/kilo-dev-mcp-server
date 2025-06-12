import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { getI18nLocales } from "../../utils/locale-utils.js";
import {
  getI18nNestedKey,
  setI18nNestedKey,
  deleteI18nNestedKey,
  cleanupEmptyI18nObjects,
} from "../../utils/json-utils.js";
import { reorderJsonToMatchSource } from "../../utils/order-utils.js";
import {
  getLocalePaths,
  findEnglishLocale,
  formatJsonWithIndentation,
  readJsonFile,
  writeJsonFile,
  ensureJsonExtension,
} from "../../utils/i18n-utils.js";

/**
 * Helper function to move a key from one file to another for a specific locale
 */
async function moveKeyForLocale(
  sourceFilePath: string,
  destFilePath: string,
  keyToMove: string,
  newKeyName: string | undefined,
  locale: string,
  isEnglishLocale: boolean,
  englishDestFilePath?: string
): Promise<string> {
  // Ensure the source file exists
  if (!existsSync(sourceFilePath)) {
    return `❌ Source file not found for locale ${locale}: ${sourceFilePath}`;
  }

  // Read source file
  let sourceContent;
  let sourceJson;
  try {
    const result = await readJsonFile(
      sourceFilePath,
      `Error parsing source file for locale ${locale}`
    );
    sourceContent = result.content;
    sourceJson = result.json;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  // Get the value to move
  const valueToMove = getI18nNestedKey(sourceJson, keyToMove);
  if (valueToMove === undefined) {
    return `❓ Key "${keyToMove}" not found in source file for locale ${locale}`;
  }

  // Create or read destination file
  let destContent = "{}";
  let destJson = {};
  if (existsSync(destFilePath)) {
    try {
      const result = await readJsonFile(
        destFilePath,
        `Error parsing destination file for locale ${locale}`
      );
      destContent = result.content;
      destJson = result.json;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  } else {
    // Create directory if it doesn't exist
    const destDir = path.dirname(destFilePath);
    if (!existsSync(destDir)) {
      await fs.mkdir(destDir, { recursive: true });
    }
  }

  // Set the value in the destination file
  const keyToSet = newKeyName || keyToMove;
  setI18nNestedKey(destJson, keyToSet, valueToMove);

  // Remove the key from the source file
  deleteI18nNestedKey(sourceJson, keyToMove);

  // Clean up any empty objects left behind
  cleanupEmptyI18nObjects(sourceJson);

  // Write source file (always as-is)
  await writeJsonFile(sourceFilePath, sourceJson, sourceContent);

  // For non-English locales, reorder keys to match English structure if available
  if (
    !isEnglishLocale &&
    englishDestFilePath &&
    existsSync(englishDestFilePath)
  ) {
    try {
      const { json: englishJson, content: englishContent } = await readJsonFile(
        englishDestFilePath
      );

      // Reorder the destination JSON to match the English structure
      const reorderedDestJson = reorderJsonToMatchSource(englishJson, destJson);

      // Write the reordered destination JSON
      await writeJsonFile(destFilePath, reorderedDestJson, englishContent);
    } catch (error) {
      // If reordering fails, fall back to original order
      console.error(
        `⚠️ Failed to reorder keys for ${locale}, writing with original order: ${error}`
      );
      await writeJsonFile(destFilePath, destJson, destContent);
    }
  } else {
    // English locale or no English reference file available
    await writeJsonFile(destFilePath, destJson, destContent);
  }

  return `✅ Moved key "${keyToMove}" ${
    newKeyName ? `to "${newKeyName}"` : ""
  } for locale ${locale}`;
}

/**
 * Move i18n key tool handler
 */
class MoveKeyTool implements ToolHandler {
  name = "move_i18n_key";
  description = "Move a key from one JSON file to another across all locales";
  inputSchema = {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["core", "webview", "package"],
        description: "Target directory (core, webview, or package)",
      },
      key: {
        type: "string",
        description: "Key to move (dot notation)",
      },
      source: {
        type: "string",
        description: 'Source file name (e.g., "common.json")',
      },
      destination: {
        type: "string",
        description: 'Destination file name (e.g., "tools.json")',
      },
      workspaceRoot: {
        type: "string",
        description:
          "Root path of the workspace/repository (used to locate locale files)",
      },
      newKey: {
        type: "string",
        description: "Optional new key name for the destination",
      },
    },
    required: ["target", "key", "source", "destination", "workspaceRoot"],
  };

  async execute(args: any, context: Context): Promise<McpToolCallResponse> {
    console.error(
      "🔍 DEBUG: Move key request received with args:",
      JSON.stringify(args, null, 2)
    );

    const { target, key, source, destination, newKey, workspaceRoot } = args;

    try {
      // Get locale paths using the utility function
      const localePaths = getLocalePaths(context, workspaceRoot);

      // Get all locales
      const locales = await getI18nLocales(target, localePaths);
      console.error(`📋 Found ${locales.length} locales`);

      // Find the English locale
      const englishLocale = findEnglishLocale(locales);
      if (!englishLocale) {
        throw new Error("English locale not found");
      }

      // Ensure source and destination file names have .json extension
      const sourceFile = ensureJsonExtension(source);
      const destFile = ensureJsonExtension(destination);

      // Move the key for each locale
      const results: string[] = [];
      for (const locale of locales) {
        let sourceFilePath: string;
        let destFilePath: string;
        let englishDestFilePath: string | undefined;

        if (target === "package") {
          // For package target, files are package.nls.{locale}.json or package.json for English
          if (locale === "en") {
            sourceFilePath = path.join(
              localePaths[target as keyof typeof localePaths],
              "package.json"
            );
            destFilePath = sourceFilePath; // Same file for package target
          } else {
            sourceFilePath = path.join(
              localePaths[target as keyof typeof localePaths],
              `package.nls.${locale}.json`
            );
            destFilePath = sourceFilePath; // Same file for package target
          }
          // For package target, there's no separate source/dest files, so no English dest file needed
          englishDestFilePath = undefined;
        } else {
          // For core/webview targets, use traditional locale subdirectory structure
          sourceFilePath = path.join(
            localePaths[target as keyof typeof localePaths],
            locale,
            sourceFile
          );
          destFilePath = path.join(
            localePaths[target as keyof typeof localePaths],
            locale,
            destFile
          );

          // For non-English locales, provide path to English destination file for key ordering
          const isEnglishLocale = locale === englishLocale;
          englishDestFilePath = isEnglishLocale
            ? undefined
            : path.join(
                localePaths[target as keyof typeof localePaths],
                englishLocale,
                destFile
              );
        }

        const isEnglishLocale = locale === englishLocale;
        const result = await moveKeyForLocale(
          sourceFilePath,
          destFilePath,
          key,
          newKey,
          locale,
          isEnglishLocale,
          englishDestFilePath
        );
        results.push(result);
      }

      return {
        content: [
          {
            type: "text",
            text: `Results of moving key "${key}" from "${source}" to "${destination}":\n\n${results.join(
              "\n"
            )}`,
          },
        ],
      };
    } catch (error) {
      console.error("❌ ERROR in handleMoveKey:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error moving key: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}

export default new MoveKeyTool();
