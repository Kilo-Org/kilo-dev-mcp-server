import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { getI18nLocales, getI18nNamespaces } from "../../utils/locale-utils.js";
import { reorderJsonToMatchSource } from "../../utils/order-utils.js";
import {
  getLocalePaths,
  findEnglishLocale,
  readJsonFile,
  writeJsonFile,
  ensureJsonExtension,
} from "../../utils/i18n-utils.js";

/**
 * Helper function to sort keys for a specific locale file based on English structure
 */
async function sortKeysForFile(
  targetFilePath: string,
  englishFilePath: string,
  locale: string,
  fileName: string
): Promise<string> {
  // Check if target file exists
  if (!existsSync(targetFilePath)) {
    return `⚠️ File not found for locale ${locale}: ${fileName}`;
  }

  // Check if English reference file exists
  if (!existsSync(englishFilePath)) {
    return `❌ English reference file not found: ${fileName}`;
  }

  try {
    // Read both files
    const targetResult = await readJsonFile(
      targetFilePath,
      `Error reading ${fileName} for locale ${locale}`
    );
    const englishResult = await readJsonFile(
      englishFilePath,
      `Error reading English ${fileName}`
    );

    // Reorder the target file to match English structure
    const sortedJson = reorderJsonToMatchSource(
      targetResult.json,
      englishResult.json
    );

    // Write the sorted file back
    await writeJsonFile(targetFilePath, sortedJson, targetResult.content);

    return `✅ Sorted ${fileName} for locale ${locale}`;
  } catch (error) {
    return `❌ Error sorting ${fileName} for locale ${locale}: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

/**
 * Sort i18n keys tool handler
 */
class SortKeysTool implements ToolHandler {
  name = "sort_i18n_keys";
  description =
    "Sort the keys in all locale files based on the English locale structure";
  inputSchema = {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["core", "webview", "package"],
        description: "Target directory (core, webview, or package)",
      },
      workspaceRoot: {
        type: "string",
        description:
          "Root path of the workspace/repository (used to locate locale files)",
      },
      files: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Optional array of specific file names to sort (e.g., ['kilocode.json', 'tools.json']). If not provided, sorts all files.",
      },
    },
    required: ["target", "workspaceRoot"],
  };

  async execute(args: any, context: Context): Promise<McpToolCallResponse> {
    console.error(
      "🔍 DEBUG: Sort keys request received with args:",
      JSON.stringify(args, null, 2)
    );

    const { target, workspaceRoot, files } = args;

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

      // Get list of files to sort
      let filesToSort: string[];
      if (files && files.length > 0) {
        // Use provided files list, ensuring .json extension
        filesToSort = files.map((file: string) => ensureJsonExtension(file));
      } else {
        // Get all available files from English locale
        filesToSort = await getI18nNamespaces(
          target,
          englishLocale,
          localePaths
        );
      }

      console.error(`📄 Sorting files: ${filesToSort.join(", ")}`);

      // Sort keys for each file in each locale
      const results: string[] = [];
      let totalSorted = 0;

      for (const fileName of filesToSort) {
        for (const locale of locales) {
          let filePath: string;
          let englishFilePath: string;

          if (target === "package") {
            // For package target, files are package.nls.{locale}.json or package.json for English
            if (locale === "en") {
              filePath = path.join(
                localePaths[target as keyof typeof localePaths],
                "package.json"
              );
            } else {
              filePath = path.join(
                localePaths[target as keyof typeof localePaths],
                `package.nls.${locale}.json`
              );
            }
            // English reference is always package.json for package target
            englishFilePath = path.join(
              localePaths[target as keyof typeof localePaths],
              "package.json"
            );
          } else {
            // For core/webview targets, use traditional locale subdirectory structure
            filePath = path.join(
              localePaths[target as keyof typeof localePaths],
              locale,
              fileName
            );
            englishFilePath = path.join(
              localePaths[target as keyof typeof localePaths],
              englishLocale,
              fileName
            );
          }

          const result = await sortKeysForFile(
            filePath,
            englishFilePath,
            locale,
            fileName
          );
          results.push(result);

          if (result.startsWith("✅")) {
            totalSorted++;
          }
        }
      }

      // Format the output
      const summary = `Sorting completed! ${totalSorted} files sorted successfully.\n\n`;
      const details = results.join("\n");

      return {
        content: [
          {
            type: "text",
            text: summary + details,
          },
        ],
      };
    } catch (error) {
      console.error("❌ ERROR in sortKeys:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error sorting keys: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}

export default new SortKeysTool();
