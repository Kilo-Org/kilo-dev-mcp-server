import { ToolHandler } from "./types.js";
import { i18nTools } from "./i18n/index.js";
import queryExpertPanelTool from "./code-expert/queryExpertPanel.js";
import { vscodeExtensionTestingTools } from "./vscode-extension-testing/index.js";

// Combine all tools from different categories
const allTools: ToolHandler[] = [
  ...i18nTools,
  queryExpertPanelTool,
  ...vscodeExtensionTestingTools,
];

/**
 * Get all registered tool handlers
 * @returns Array of all tool handlers
 */
export function getAllTools(): ToolHandler[] {
  return allTools;
}

/**
 * Get a specific tool handler by name
 * @param name Name of the tool
 * @returns Tool handler if found, undefined otherwise
 */
export function getToolByName(name: string): ToolHandler | undefined {
  const tool = allTools.find((tool) => tool.name === name);
  if (!tool) {
    console.error(`Tool not found: ${name}`);
    console.error(`Available tools: ${allTools.map((t) => t.name).join(", ")}`);
  }
  return tool;
}

/**
 * List all available tools with their descriptions
 * @returns Object mapping tool names to their descriptions
 */
export function listAvailableTools(): Record<string, string> {
  const toolMap: Record<string, string> = {};
  allTools.forEach((tool) => {
    toolMap[tool.name] = tool.description;
  });
  return toolMap;
}
