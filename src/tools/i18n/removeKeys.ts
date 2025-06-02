import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { getI18nLocales } from "../../utils/locale-utils.js";
import {
  getLocalePaths,
  findEnglishLocale,
  formatJsonWithIndentation,
} from "../../utils/i18n-utils.js";

// Exported for testing
export async function removeKeysFromFile(
  filePath: string,
  keys: string[]
): Promise<{ keysRemoved: number; content: string }> {
  // Read the locale file
  const content = await fs.readFile(filePath, "utf-8");
  let json = JSON.parse(content);

  let keysRemoved = 0;

  // Remove each specified key
  for (const key of keys) {
    if (json.hasOwnProperty(key)) {
      delete json[key];
      keysRemoved++;
    }
  }

  // Format the JSON with the original indentation
  const formattedJson = formatJsonWithIndentation(json, content);

  return { keysRemoved, content: formattedJson };
}

/**
 * Remove i18n keys tool handler
 * Removes specified keys from all locale files
 */
class RemoveKeysTool implements ToolHandler {
  name = "remove_i18n_keys";
  description =
    "Remove specified keys from all locale files across all languages";
  inputSchema = {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["core", "webview"],
        description: "Target directory (core or webview)",
      },
      file: {
        type: "string",
        description: "JSON file name without extension (e.g., 'kilocode')",
      },
      keys: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          "Array of keys to remove (e.g., ['superWackyBananaPhoneTranslation', 'crazyRainbowUnicornDance'])",
      },
      workspaceRoot: {
        type: "string",
        description:
          "Root path of the workspace/repository (used to locate locale files)",
      },
    },
    required: ["target", "file", "keys"],
  };

  async execute(args: any, context: Context): Promise<McpToolCallResponse> {
    console.error(
      "🔍 DEBUG: Remove keys request received with args:",
      JSON.stringify(args, null, 2)
    );

    const { target, file, keys, workspaceRoot } = args;

    if (!Array.isArray(keys) || keys.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No keys provided to remove. Please specify 'keys' as an array of strings.",
          },
        ],
        isError: true,
      };
    }

    try {
      // Get locale paths using the utility function
      const localePaths = getLocalePaths(context, workspaceRoot);

      // Get all locales
      const locales = await getI18nLocales(target, localePaths);
      console.error(`📋 Found ${locales.length} locales`);

      // Find the English locale for reference
      const englishLocale = findEnglishLocale(locales);

      if (!englishLocale) {
        return {
          content: [
            {
              type: "text",
              text: "Error: English locale not found",
            },
          ],
          isError: true,
        };
      }

      const jsonFile = `${file}.json`;
      const results: string[] = [];
      let totalRemoved = 0;
      let totalFiles = 0;

      // Process each locale
      for (const locale of locales) {
        const localeFilePath = path.join(
          localePaths[target as keyof typeof localePaths],
          locale,
          jsonFile
        );

        // Skip if file doesn't exist
        if (!existsSync(localeFilePath)) {
          results.push(`⚠️ File not found: ${localeFilePath}`);
          continue;
        }

        try {
          // Use the extracted function to remove keys and preserve formatting
          const result = await removeKeysFromFile(localeFilePath, keys);
          const keysRemovedInThisFile = result.keysRemoved;
          totalRemoved += keysRemovedInThisFile;

          if (keysRemovedInThisFile > 0) {
            // Write the updated file with preserved formatting
            await fs.writeFile(localeFilePath, result.content);
            results.push(
              `✅ Removed ${keysRemovedInThisFile} keys from ${locale}/${jsonFile}`
            );
            totalFiles++;
          } else {
            results.push(`ℹ️ No keys to remove in ${locale}/${jsonFile}`);
          }
        } catch (error) {
          results.push(
            `❌ Error processing ${locale}/${jsonFile}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Prepare summary
      const summary = `Successfully removed ${totalRemoved} keys from ${totalFiles} files.`;

      return {
        content: [
          {
            type: "text",
            text: `${results.join("\n")}\n\n${summary}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}

export default new RemoveKeysTool();
