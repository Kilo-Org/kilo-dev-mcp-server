/**
 * VSCode Extension Testing Tools
 * Exports all tools for testing VSCode extensions
 */

import launchDevExtensionTool from "./launchDevExtension.js";
import stopDevExtensionTool from "./stopDevExtension.js";
import { ToolHandler } from "../types.js";

/**
 * Array of all VSCode extension testing tools
 */
export const vscodeExtensionTestingTools: ToolHandler[] = [
  launchDevExtensionTool,
  stopDevExtensionTool,
];

/**
 * Export individual tools
 */
export { launchDevExtensionTool, stopDevExtensionTool };
