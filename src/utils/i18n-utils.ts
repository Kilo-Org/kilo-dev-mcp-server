/**
 * Common utility functions for i18n tools
 */
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { Context } from "../tools/types.js";
import { detectIndentation } from "./json-utils.js";

/**
 * Determine locale paths based on workspace root
 * REQUIRES workspace root parameter - no fallbacks
 */
export function getLocalePaths(
  context: Context,
  workspaceRoot?: string
): { core: string; webview: string; package: string } {
  if (!workspaceRoot) {
    throw new Error(
      "workspaceRoot parameter is required - no fallback paths will be used"
    );
  }

  console.error(
    `🔍 DEBUG: getLocalePaths called with workspaceRoot: ${workspaceRoot}`
  );
  console.error(
    `🔍 DEBUG: Original context paths:`,
    JSON.stringify(context.LOCALE_PATHS, null, 2)
  );

  const localePaths = {
    core: path.join(workspaceRoot, "src/i18n/locales"),
    webview: path.join(workspaceRoot, "webview-ui/src/i18n/locales"),
    package: path.join(workspaceRoot, "src"),
  };

  console.error(
    `🔍 DEBUG: Constructed new locale paths:`,
    JSON.stringify(localePaths, null, 2)
  );

  return localePaths;
}

/**
 * Find the English locale from a list of locales
 */
export function findEnglishLocale(locales: string[]): string | undefined {
  return locales.find((locale) => locale.toLowerCase().startsWith("en"));
}

/**
 * Format JSON content preserving the original indentation style
 */
export function formatJsonWithIndentation(
  json: any,
  originalContent: string
): string {
  // Detect indentation from the original file
  const indent = detectIndentation(originalContent);
  const indentSize = indent.size;
  const indentChar = indent.char;

  // Format the JSON with the original indentation size
  // This gives us proper nesting structure but with spaces
  const jsonString = JSON.stringify(json, null, indentSize);

  // If we're using tabs, we need to replace all indentation spaces with tabs
  if (indentChar === "\t") {
    // Replace all indentation spaces with tabs
    // This regex matches any number of spaces at the beginning of a line
    // and replaces each group of 'indentSize' spaces with a tab
    let formattedJson = jsonString;

    // Handle all levels of indentation
    for (let level = 10; level > 0; level--) {
      // Start with deepest nesting (10 levels should be enough)
      const spaces = " ".repeat(level * indentSize);
      const tabs = "\t".repeat(level);
      const regex = new RegExp(`^${spaces}`, "gm");
      formattedJson = formattedJson.replace(regex, tabs);
    }

    // Add a newline at the end for consistency
    return formattedJson + "\n";
  }

  // For space indentation, we can use the JSON.stringify result directly
  return jsonString + "\n";
}

/**
 * Read and parse a JSON file with error handling
 */
export async function readJsonFile(
  filePath: string,
  errorPrefix: string = "Error"
): Promise<{ content: string; json: any }> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const json = JSON.parse(content);
    return { content, json };
  } catch (error) {
    throw new Error(
      `${errorPrefix}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Write JSON to a file preserving the original formatting
 */
export async function writeJsonFile(
  filePath: string,
  json: any,
  originalContent: string
): Promise<void> {
  const formattedJson = formatJsonWithIndentation(json, originalContent);
  await fs.writeFile(filePath, formattedJson, "utf-8");
}

/**
 * Ensure a file path has a .json extension
 */
export function ensureJsonExtension(fileName: string): string {
  return fileName.endsWith(".json") ? fileName : `${fileName}.json`;
}
