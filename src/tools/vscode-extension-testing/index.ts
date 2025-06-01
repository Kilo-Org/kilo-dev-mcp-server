/**
 * VSCode Extension Testing Tools
 * Exports all tools for testing VSCode extensions
 */

import launchDevExtensionTool from "./launchDevExtension.js";
import stopDevExtensionTool from "./stopDevExtension.js";
import writePromptFileTool from "./writePromptFile.js";
import { ToolHandler } from "../types.js";

/**
 * Array of all VSCode extension testing tools
 */
export const vscodeExtensionTestingTools: ToolHandler[] = [
  launchDevExtensionTool,
  stopDevExtensionTool,
  writePromptFileTool, // Add the new tool
];

/**
 * Export individual tools
 */
export { launchDevExtensionTool, stopDevExtensionTool, writePromptFileTool };
