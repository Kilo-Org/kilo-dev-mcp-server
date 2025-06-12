import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import pLimit from "p-limit";

import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import {
  getI18nLocales,
  getI18nNamespaces,
  getLanguageFromLocale,
} from "../../utils/locale-utils.js";
import { translateI18nText } from "./translation.js";
import { getI18nNestedKey, setI18nNestedKey } from "../../utils/json-utils.js";
import { reorderJsonToMatchSource } from "../../utils/order-utils.js";
import {
  getLocalePaths,
  findEnglishLocale,
  readJsonFile,
  writeJsonFile,
} from "../../utils/i18n-utils.js";

/**
 * Expand keys using the colon format
 * For example, "kilocode:veryCool" will expand to ["kilocode.veryCool.one", "kilocode.veryCool.many"]
 * The colon format is required to clearly separate the filename from the key path
 */
async function expandParentKeys(
  paths: string[],
  target: "core" | "webview" | "package",
  localePaths: { core: string; webview: string; package: string },
  debugMessages: string[] = []
): Promise<string[]> {
  // Get all locales to find English
  const locales = await getI18nLocales(target, localePaths);
  const englishLocale = locales.find((locale) =>
    locale.toLowerCase().startsWith("en")
  );

  if (!englishLocale) {
    throw new Error("English locale not found");
  }

  const expandedPaths: string[] = [];

  for (const keyPath of paths) {
    // Skip undefined or null paths
    if (!keyPath) {
      console.error("Skipping undefined or null path");
      continue;
    }

    // Handle different key formats based on target
    if (target === "package") {
      // For package target, keys are direct flat keys (no filename prefix needed)
      // since there's only one file per locale and keys are stored flat like "command.generateCommitMessage.title"
      const directKey = keyPath;
      const englishFilePath = path.join(localePaths[target], "package.json");

      debugMessages.push(
        `🔍 DEBUG: Package target - checking for key: ${directKey}`
      );
      debugMessages.push(`🔍 DEBUG: Package file path: ${englishFilePath}`);

      // Check if the file exists
      if (!existsSync(englishFilePath)) {
        debugMessages.push(`❌ Package file not found: ${englishFilePath}`);
        debugMessages.push(
          `🔍 DEBUG: Tried to access package.json at: ${englishFilePath}`
        );
        debugMessages.push(
          `🔍 DEBUG: localePaths[${target}] = ${localePaths[target]}`
        );
        continue;
      }

      // Read the English file
      const englishContent = await fs.readFile(englishFilePath, "utf-8");
      const englishJson = JSON.parse(englishContent);

      // Enhanced debugging - show file structure
      const allKeys = Object.keys(englishJson);
      debugMessages.push(
        `🔍 DEBUG: Found package.json with ${allKeys.length} total keys`
      );
      debugMessages.push(
        `🔍 DEBUG: First 10 keys: ${allKeys.slice(0, 10).join(", ")}`
      );
      debugMessages.push(`🔍 DEBUG: Looking for exact key: "${directKey}"`);

      // Check for similar keys to help with debugging
      const similarKeys = allKeys.filter(
        (key) =>
          key.toLowerCase().includes(directKey.toLowerCase()) ||
          directKey.toLowerCase().includes(key.toLowerCase())
      );
      if (similarKeys.length > 0) {
        debugMessages.push(
          `🔍 DEBUG: Similar keys found: ${similarKeys.join(", ")}`
        );
      }

      // For package target, check if the key exists directly in the flat structure
      if (englishJson.hasOwnProperty(directKey)) {
        // Key exists directly, add it
        expandedPaths.push(directKey);
        debugMessages.push(`✅ Found direct key: ${directKey}`);
      } else {
        // Key doesn't exist directly, check if it's a prefix for other keys (parent expansion)
        const matchingKeys = Object.keys(englishJson).filter(
          (key) => key.startsWith(directKey + ".") || key === directKey
        );

        if (matchingKeys.length > 0) {
          expandedPaths.push(...matchingKeys);
          debugMessages.push(
            `✅ Found ${
              matchingKeys.length
            } keys matching prefix "${directKey}": ${matchingKeys.join(", ")}`
          );
        } else {
          debugMessages.push(
            `❌ No keys found matching "${directKey}" in package.json`
          );
          debugMessages.push(`🔍 DEBUG: Exact key "${directKey}" not found`);
          debugMessages.push(`🔍 DEBUG: No keys start with "${directKey}."`);
          debugMessages.push(`🔍 DEBUG: Available keys: ${allKeys.join(", ")}`);
        }
      }
    } else if (keyPath.includes(":")) {
      // All keys for core/webview must use the colon format (filename:keyPath)
      const parts = keyPath.split(":");

      // Ensure we have exactly two parts (fileName:parentKey)
      if (parts.length !== 2) {
        console.error(
          `Invalid parent key format: ${keyPath} (should be in format 'file:key')`
        );
        continue;
      }

      const [fileName, parentKey] = parts;

      // Ensure both parts are non-empty
      if (!fileName || !parentKey) {
        console.error(
          `Invalid parent key format: ${keyPath} (file or key is empty)`
        );
        continue;
      }

      // Standard case for regular i18n files
      const jsonFile = `${fileName}.json`;
      let englishFilePath = path.join(
        localePaths[target],
        englishLocale,
        jsonFile
      );

      // Log the paths being checked
      console.error(
        `🔍 DEBUG: Checking for English file at: ${englishFilePath}`
      );
      console.error(
        `🔍 DEBUG: localePaths for ${target}: ${localePaths[target]}`
      );

      // Check if the file exists
      if (!existsSync(englishFilePath)) {
        // Try alternative path for package.nls files
        if (fileName === "package" || fileName === "package.nls") {
          // Try looking in src directory
          const altPath = path.join(
            path.dirname(path.dirname(localePaths[target])), // Go up two levels
            "src",
            jsonFile
          );
          console.error(`🔍 DEBUG: Trying alternative path: ${altPath}`);

          if (existsSync(altPath)) {
            englishFilePath = altPath;
            console.error(
              `✅ Found file at alternative path: ${englishFilePath}`
            );
          } else {
            console.error(`File not found at alternative path: ${altPath}`);
            continue;
          }
        } else {
          console.error(`File not found: ${englishFilePath}`);
          continue;
        }
      }

      // Read the English file
      const englishContent = await fs.readFile(englishFilePath, "utf-8");
      const englishJson = JSON.parse(englishContent);

      // Log the file content structure
      console.error(
        `🔍 DEBUG: Found English file with keys: ${Object.keys(
          englishJson
        ).join(", ")}`
      );

      // Get the parent object or string
      const parentValue = getI18nNestedKey(englishJson, parentKey);

      if (parentValue === undefined) {
        console.error(`Parent key "${parentKey}" in ${jsonFile} doesn't exist`);
        continue;
      }

      // Handle both object and string cases
      if (typeof parentValue === "string") {
        // If it's a string, just add the key directly
        expandedPaths.push(`${fileName}.${parentKey}`);
      } else if (typeof parentValue === "object" && parentValue !== null) {
        // If it's an object, recursively collect all leaf string keys
        const leafKeys = collectLeafStringKeys(parentValue, parentKey);

        // Add all leaf keys with the file prefix
        for (const leafKey of leafKeys) {
          expandedPaths.push(`${fileName}.${leafKey}`);
        }
      } else {
        console.error(
          `Parent key "${parentKey}" in ${jsonFile} is not a string or object`
        );
        continue;
      }
    } else {
      // Reject keys that don't use the colon format
      console.error(
        `❌ Invalid key format: ${keyPath} (must use colon format 'filename:keyPath', e.g., 'kilocode:lowCreditWarning.nice')`
      );
    }
  }

  return expandedPaths;
}

/**
 * Recursively collect all leaf string keys from an object
 * Returns keys in dot notation
 */
function collectLeafStringKeys(obj: any, prefix: string = ""): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        // This is a leaf string node
        keys.push(currentPath);
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // This is an object, recursively collect its keys
        const nestedKeys = collectLeafStringKeys(value, currentPath);
        keys.push(...nestedKeys);
      }
    }
  }

  return keys;
}

/**
 * Translate i18n key tool handler
 */
class TranslateKeyTool implements ToolHandler {
  name = "translate_i18n_key";
  description =
    "Translate a specific key or keys from English to other languages";
  inputSchema = {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: ["core", "webview", "package"],
        description: "Target directory (core, webview, or package)",
      },
      paths: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          'Array of paths to translate in English locale. For core/webview targets, use format "filename:keyPath" (e.g., "kilocode:lowCreditWarning.nice"). For package target, use the direct key path (e.g., "command.generateCommitMessage.title") - namespace prefixes like "package:" will be automatically stripped.',
      },
      workspaceRoot: {
        type: "string",
        description:
          "Root path of the workspace/repository (used to locate locale files)",
      },
      useCurrentFile: {
        type: "boolean",
        description:
          "Use the currently open file as context for translation (optional)",
      },
      model: {
        type: "string",
        description: "Model to use for translation (optional)",
      },
      targetLocales: {
        type: "array",
        items: {
          type: "string",
        },
        description: "List of locale codes to translate to (empty for all)",
      },
    },
    required: ["target", "paths", "workspaceRoot"],
  };

  async execute(args: any, context: Context): Promise<McpToolCallResponse> {
    const debugMessages: string[] = [];

    debugMessages.push("🔍 DEBUG: Translation request received with args:");
    debugMessages.push(JSON.stringify(args, null, 2));

    const {
      target,
      paths,
      workspaceRoot,
      useCurrentFile = false,
      model = context.DEFAULT_MODEL,
      targetLocales = [],
      chunkSize = 5,
    } = args;

    if (!Array.isArray(paths) || paths.length === 0) {
      console.error("❌ ERROR: No translation keys provided in paths array");
      return {
        content: [
          {
            type: "text",
            text: "Error: No translation keys provided. Please specify 'paths' as an array of strings in the format 'filename:keyPath' (e.g., 'kilocode:lowCreditWarning.nice').",
          },
        ],
        isError: true,
      };
    }

    // Get locale paths using the utility function
    const localePaths = getLocalePaths(context, workspaceRoot);

    debugMessages.push("🔍 DEBUG: Actual locale paths being used:");
    debugMessages.push(JSON.stringify(localePaths, null, 2));

    try {
      // Get all locales to translate to
      const locales = await getI18nLocales(target, localePaths);
      console.error(`📋 Found ${locales.length} locales in total`);

      // Find the English locale
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

      // Process paths to handle different formats and auto-detection
      let processedPaths = [...paths];

      // For package target, strip any namespace prefixes and handle flat key structure
      if (target === "package") {
        debugMessages.push(
          `🔍 DEBUG: Processing ${processedPaths.length} paths for package target`
        );
        debugMessages.push(
          `🔍 DEBUG: Original paths: ${processedPaths.join(", ")}`
        );

        processedPaths = processedPaths.map((p: string) => {
          // Strip namespace prefix if present (e.g., "package:command.title" -> "command.title")
          if (p.includes(":")) {
            const parts = p.split(":");
            if (parts.length === 2) {
              debugMessages.push(
                `🔍 DEBUG: Stripping namespace "${parts[0]}" from package key, using: ${parts[1]}`
              );
              return parts[1];
            } else {
              debugMessages.push(
                `🔍 DEBUG: Invalid namespace format in "${p}", expected exactly one colon`
              );
            }
          } else {
            debugMessages.push(
              `🔍 DEBUG: No namespace found in "${p}", using as-is`
            );
          }
          return p;
        });

        debugMessages.push(
          `🔍 DEBUG: Processed paths: ${processedPaths.join(", ")}`
        );
      }

      // Handle context-awareness if useCurrentFile is true
      if (useCurrentFile && process.env.VSCODE_OPEN_FILES) {
        try {
          const openFiles = JSON.parse(process.env.VSCODE_OPEN_FILES);
          const i18nFiles = openFiles.filter(
            (file: string) =>
              file.includes("/i18n/locales/") && file.endsWith(".json")
          );

          if (i18nFiles.length > 0) {
            // Extract filename from the first i18n file
            const currentFile = i18nFiles[0];
            const fileName = path.basename(currentFile, ".json");

            // Add filename prefix to any paths that don't have it
            processedPaths = processedPaths.map((p: string) => {
              if (!p.includes(".") && !p.includes(":")) {
                return `${fileName}.${p}`;
              }
              return p;
            });

            console.error(`🔍 Using context from open file: ${fileName}.json`);
          }
        } catch (error) {
          console.error(`⚠️ Error processing open files context: ${error}`);
        }
      }

      // Process paths to expand parent keys and handle auto-detection
      debugMessages.push(
        `🔍 DEBUG: Expanding paths: ${processedPaths.join(", ")}`
      );
      const keyPaths = await expandParentKeys(
        processedPaths,
        target,
        localePaths,
        debugMessages
      );

      console.error(
        `🔍 Starting translation for ${keyPaths.length} key(s): ${keyPaths.join(
          ", "
        )}`
      );
      console.error(`🌐 Using model: ${model}`);
      console.error(
        `⚡ Parallelization: Processing up to ${chunkSize} translations concurrently`
      );

      // Filter locales if targetLocales is specified
      const localesToTranslate =
        targetLocales.length > 0
          ? locales.filter(
              (locale) =>
                targetLocales.includes(locale) && locale !== englishLocale
            )
          : locales.filter((locale) => locale !== englishLocale);

      if (localesToTranslate.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Error: No target locales to translate to",
            },
          ],
          isError: true,
        };
      }

      // Initialize results array
      const allResults: string[] = [];
      let totalSuccessCount = 0;
      let completedCount = 0;

      // Create a concurrency limiter
      const limit = pLimit(chunkSize);

      // Group keys by file to optimize file operations
      const keysByFile: Record<string, string[]> = {};

      // Validate all keys and group them by file
      for (const keyPath of keyPaths) {
        if (!keyPath || typeof keyPath !== "string") {
          allResults.push(`❌ Invalid key path: ${keyPath}`);
          continue;
        }

        if (target === "package") {
          // For package target, keys are direct flat keys (no filename prefix)
          const jsonFile = "package.json";
          const keyInFile = keyPath; // Use the key directly as it appears in the flat structure

          if (!keysByFile[jsonFile]) {
            keysByFile[jsonFile] = [];
          }

          keysByFile[jsonFile].push(keyInFile);
        } else {
          // Keys must be in the format filename.key1.key2...
          // This is the internal format after expansion from filename:key1.key2...
          const parts = keyPath.split(".");
          if (parts.length < 2) {
            allResults.push(
              `❌ Invalid key format: ${keyPath} (should be in internal format 'filename.keyPath' after expansion)`
            );
            continue;
          }

          const fileName = parts[0];
          const keyParts = parts.slice(1);
          const jsonFile = `${fileName}.json`;
          const keyInFile = keyParts.join(".");

          if (!keysByFile[jsonFile]) {
            keysByFile[jsonFile] = [];
          }

          keysByFile[jsonFile].push(keyInFile);
        }
      }

      // Calculate total keys to translate
      const totalKeysCount =
        Object.entries(keysByFile).reduce(
          (acc, [_, keys]) => acc + keys.length,
          0
        ) * localesToTranslate.length;
      console.error(`🔢 Total translation tasks: ${totalKeysCount}`);

      // Store all file write operations to perform at the end
      type FileWriteOperation = {
        targetFilePath: string;
        targetJson: Record<string, any>;
        targetContent: string;
        locale: string;
        jsonFile: string;
      };
      const fileWriteOperations: FileWriteOperation[] = [];

      // Create translation tasks for all files and locales
      const translationTasks: Promise<void>[] = [];

      // Process each file
      for (const [jsonFile, keysInFile] of Object.entries(keysByFile)) {
        // Handle different file structures based on target
        let englishFilePath: string = "";
        let isPackageTarget = target === "package";

        if (isPackageTarget && jsonFile === "package.json") {
          // For package target, the English source is package.json
          englishFilePath = path.join(
            localePaths[target as keyof typeof localePaths],
            "package.json"
          );

          console.error(
            `🔍 DEBUG: Package target - looking for package.json at: ${englishFilePath}`
          );

          if (!existsSync(englishFilePath)) {
            console.error(
              `❌ Could not find package.json at: ${englishFilePath}`
            );
            allResults.push(
              `❌ File not found: package.json at ${englishFilePath}`
            );
            continue;
          }
        } else if (
          jsonFile === "package.json" ||
          jsonFile === "package.nls.json"
        ) {
          // Legacy handling for package.nls files in core/webview targets
          const packageFile =
            jsonFile === "package.json" ? "package.nls.json" : jsonFile;

          // Try several possible locations for the package.nls.json file
          const possiblePaths = [
            // Direct in workspace root
            path.join(workspaceRoot || "", packageFile),
            // In src directory
            path.join(workspaceRoot || "", "src", packageFile),
            // Standard i18n path
            path.join(
              localePaths[target as keyof typeof localePaths],
              englishLocale,
              packageFile
            ),
          ];

          console.error(
            `🔍 DEBUG: Legacy package.nls file, trying multiple paths`
          );

          // Find the first path that exists
          let foundPath = false;
          for (const possiblePath of possiblePaths) {
            console.error(`🔍 DEBUG: Checking path: ${possiblePath}`);
            if (existsSync(possiblePath)) {
              englishFilePath = possiblePath;
              foundPath = true;
              console.error(`✅ Found package.nls file at: ${englishFilePath}`);
              break;
            }
          }

          if (!foundPath) {
            console.error(
              `❌ Could not find package.nls file in any expected location`
            );
            allResults.push(
              `❌ File not found: package.nls.json (tried multiple locations)`
            );
            continue;
          }
        } else {
          // Standard case for regular i18n files
          englishFilePath = path.join(
            localePaths[target as keyof typeof localePaths],
            englishLocale,
            jsonFile
          );

          // Log the file path details
          console.error(`🔍 DEBUG: Looking for file: ${englishFilePath}`);
          console.error(
            `🔍 DEBUG: Base locale path: ${
              localePaths[target as keyof typeof localePaths]
            }`
          );

          if (!existsSync(englishFilePath)) {
            // Try to suggest available files
            try {
              const availableFiles = await getI18nNamespaces(
                target,
                englishLocale,
                localePaths
              );
              const suggestion =
                availableFiles.length > 0
                  ? `\nAvailable files: ${availableFiles.join(", ")}`
                  : "";
              allResults.push(
                `❌ File not found: ${englishFilePath}${suggestion}`
              );
            } catch (error) {
              allResults.push(`❌ File not found: ${englishFilePath}`);
            }
            continue;
          }
        }

        // Read the English file using our utility
        const { content: englishContent, json: englishJson } =
          await readJsonFile(englishFilePath);

        // Validate all keys in this file
        const validKeys: string[] = [];
        const invalidKeys: string[] = [];

        for (const keyInFile of keysInFile) {
          let valueToTranslate;

          if (isPackageTarget) {
            // For package target, keys are stored flat, so access directly
            valueToTranslate = englishJson[keyInFile];
          } else {
            // For core/webview targets, use nested key access
            valueToTranslate = getI18nNestedKey(englishJson, keyInFile);
          }

          console.error(
            `🔍 DEBUG: Key "${keyInFile}" in ${jsonFile} => Value: "${valueToTranslate}"`
          );

          if (valueToTranslate === undefined) {
            // Enhanced error reporting for package targets
            if (isPackageTarget) {
              const allKeys = Object.keys(englishJson);
              const similarKeys = allKeys.filter(
                (key) =>
                  key.toLowerCase().includes(keyInFile.toLowerCase()) ||
                  keyInFile.toLowerCase().includes(key.toLowerCase())
              );

              let errorMsg = `❌ Key "${keyInFile}" not found in ${jsonFile}`;
              if (similarKeys.length > 0) {
                errorMsg += `\n🔍 Similar keys found: ${similarKeys
                  .slice(0, 5)
                  .join(", ")}`;
              }
              errorMsg += `\n🔍 Total keys in file: ${allKeys.length}`;
              errorMsg += `\n🔍 First 10 keys: ${allKeys
                .slice(0, 10)
                .join(", ")}`;

              allResults.push(errorMsg);
            } else {
              allResults.push(`❌ Key "${keyInFile}" not found in ${jsonFile}`);
            }
            invalidKeys.push(keyInFile);
            continue;
          }

          if (typeof valueToTranslate !== "string") {
            allResults.push(
              `❌ Value at key "${keyInFile}" in ${jsonFile} is not a string`
            );
            invalidKeys.push(keyInFile);
            continue;
          }

          validKeys.push(keyInFile);
        }

        if (validKeys.length === 0) {
          continue; // Skip this file if no valid keys
        }

        console.error(
          `🌍 Preparing translations for ${localesToTranslate.length} locales for file ${jsonFile}`
        );

        // Process each locale
        for (const locale of localesToTranslate) {
          // Skip English locale
          if (locale === englishLocale) continue;

          let targetFilePath: string;

          if (isPackageTarget) {
            // For package target, files are package.nls.{locale}.json in the same directory
            if (locale === "en") {
              // English is the source package.json file
              targetFilePath = englishFilePath;
            } else {
              // Other locales are package.nls.{locale}.json
              targetFilePath = path.join(
                localePaths[target as keyof typeof localePaths],
                `package.nls.${locale}.json`
              );
            }
          } else {
            // For core/webview targets, use the traditional locale subdirectory structure
            targetFilePath = path.join(
              localePaths[target as keyof typeof localePaths],
              locale,
              jsonFile
            );
          }

          // Create directory if it doesn't exist
          const targetDir = path.dirname(targetFilePath);
          if (!existsSync(targetDir)) {
            await fs.mkdir(targetDir, { recursive: true });
          }

          // Read or create target file
          let targetJson = {};
          let targetContent = "{}";
          if (existsSync(targetFilePath)) {
            try {
              const result = await readJsonFile(targetFilePath);
              targetContent = result.content;
              targetJson = result.json;
            } catch (error) {
              console.error(`⚠️ Error reading target file: ${error}`);
              // Continue with empty JSON if file can't be read
            }
          }

          // Store the file operation for later
          const fileOp: FileWriteOperation = {
            targetFilePath,
            targetJson,
            targetContent,
            locale,
            jsonFile,
          };
          fileWriteOperations.push(fileOp);

          // Create translation tasks for each key in this file and locale
          for (const keyInFile of validKeys) {
            let valueToTranslate;

            if (isPackageTarget) {
              // For package target, keys are stored flat
              valueToTranslate = englishJson[keyInFile];
            } else {
              // For core/webview targets, use nested key access
              valueToTranslate = getI18nNestedKey(englishJson, keyInFile);
            }

            // Create a task for each translation and add it to the queue
            const task = limit(async () => {
              const taskId = `${locale}:${jsonFile}:${keyInFile}`;
              try {
                // Translate the text
                const translatedValue = await translateI18nText(
                  valueToTranslate as string,
                  getLanguageFromLocale(locale),
                  context.OPENROUTER_API_KEY,
                  model
                );

                // Set the translated value in the target JSON
                if (isPackageTarget) {
                  // For package target, set the key directly in the flat structure
                  fileOp.targetJson[keyInFile] = translatedValue;
                } else {
                  // For core/webview targets, use nested key setting
                  setI18nNestedKey(
                    fileOp.targetJson,
                    keyInFile,
                    translatedValue
                  );
                }

                allResults.push(
                  `✅ Translated key "${keyInFile}" in ${locale}`
                );
                totalSuccessCount++;

                // Update progress
                completedCount++;
                const progress = Math.round(
                  (completedCount / totalKeysCount) * 100
                );
                console.error(
                  `⏳ Progress: ${completedCount}/${totalKeysCount} (${progress}%) - Completed: ${taskId}`
                );
              } catch (error) {
                allResults.push(
                  `❌ Failed to translate key "${keyInFile}" in ${locale}: ${
                    error instanceof Error ? error.message : String(error)
                  }`
                );

                // Update progress even for failures
                completedCount++;
                const progress = Math.round(
                  (completedCount / totalKeysCount) * 100
                );
                console.error(
                  `⏳ Progress: ${completedCount}/${totalKeysCount} (${progress}%) - Failed: ${taskId}`
                );
              }
            });

            translationTasks.push(task);
          }
        }
      }

      // Wait for all translation tasks to complete
      console.error(
        `🚀 Starting ${translationTasks.length} parallel translation tasks...`
      );
      await Promise.all(translationTasks);
      console.error(`✅ All translation tasks completed`);

      // Write all files after translations are complete
      console.error(`💾 Writing translated files...`);
      for (const {
        targetFilePath,
        targetJson,
        targetContent,
        locale,
        jsonFile,
      } of fileWriteOperations) {
        // For non-English locales, reorder the keys to match the English structure
        if (locale !== englishLocale) {
          // Get the corresponding English file to use as ordering reference
          const englishFilePath = path.join(
            localePaths[target as keyof typeof localePaths],
            englishLocale,
            jsonFile
          );

          if (existsSync(englishFilePath)) {
            try {
              const { content: englishContent, json: englishJson } =
                await readJsonFile(englishFilePath);

              // Reorder the JSON object to match the English structure
              // The target is the JSON we want to reorder (targetJson)
              // The source is the reference for ordering (englishJson)
              const orderedJson = reorderJsonToMatchSource(
                targetJson,
                englishJson
              );

              // Write the file using our utility to preserve formatting
              // Use the target's original content for formatting, not the English content
              await writeJsonFile(targetFilePath, orderedJson, targetContent);
              console.error(
                `💾 Saved and reordered translations to ${locale}/${jsonFile}`
              );
            } catch (error) {
              console.error(`⚠️ Error reordering JSON: ${error}`);

              // Write the file using our utility to preserve formatting
              await writeJsonFile(targetFilePath, targetJson, targetContent);
              console.error(
                `💾 Saved translations to ${locale}/${jsonFile} without reordering`
              );
            }
          } else {
            // Write the file using our utility to preserve formatting
            await writeJsonFile(targetFilePath, targetJson, targetContent);
            console.error(`💾 Saved translations to ${locale}/${jsonFile}`);
          }
        } else {
          // Write the file using our utility to preserve formatting
          await writeJsonFile(targetFilePath, targetJson, targetContent);
          console.error(`💾 Saved translations to ${locale}/${jsonFile}`);
        }
      }

      // Calculate success rate
      const successRate =
        totalKeysCount > 0
          ? Math.round((totalSuccessCount / totalKeysCount) * 100)
          : 0;

      return {
        content: [
          {
            type: "text",
            text: `Translation results:\n\n${allResults.join(
              "\n"
            )}\n\nSuccessfully translated ${totalSuccessCount} of ${totalKeysCount} keys (${successRate}%).\n\nThe translations have been updated.\n\n--- DEBUG INFORMATION ---\n${debugMessages.join(
              "\n"
            )}`,
          },
        ],
      };
    } catch (error) {
      console.error("❌ CRITICAL ERROR in handleTranslateKey:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.stack : String(error)
      );

      return {
        content: [
          {
            type: "text",
            text: `Error translating keys: ${
              error instanceof Error ? error.message : String(error)
            }\n\n--- DEBUG INFORMATION ---\n${debugMessages.join("\n")}`,
          },
        ],
        isError: true,
      };
    }
  }
}

// Export the tool
const translateKeyTool: ToolHandler = new TranslateKeyTool();
export default translateKeyTool;
