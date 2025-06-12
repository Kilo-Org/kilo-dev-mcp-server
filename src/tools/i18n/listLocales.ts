import path from "node:path";
import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { getI18nLocales, getI18nNamespaces } from "../../utils/locale-utils.js";
import { getLocalePaths, findEnglishLocale } from "../../utils/i18n-utils.js";

/**
 * List locales tool handler
 */
class ListLocalesTool implements ToolHandler {
  name = "list_locales";
  description = "List all available locales";
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
    },
    required: ["target", "workspaceRoot"],
  };

  async execute(args: any, context: Context): Promise<McpToolCallResponse> {
    console.error(
      "🔍 DEBUG: List locales request received with args:",
      JSON.stringify(args, null, 2)
    );

    const { target, workspaceRoot } = args;

    try {
      // Get locale paths using the utility function
      const localePaths = getLocalePaths(context, workspaceRoot);

      // Get all locales
      const locales = await getI18nLocales(target, localePaths);
      console.error(`📋 Found ${locales.length} locales`);

      // Get namespaces (files) for English locale to show available files
      const englishLocale = findEnglishLocale(locales);
      let namespaces: string[] = [];

      if (englishLocale) {
        namespaces = await getI18nNamespaces(
          target,
          englishLocale,
          localePaths
        );
      }

      // Format the output
      const localesList = locales.map((locale) => `- ${locale}`).join("\n");
      const namespacesList =
        namespaces.length > 0
          ? `\n\nAvailable files in English locale:\n${namespaces
              .map((ns) => `- ${ns}`)
              .join("\n")}`
          : "";

      return {
        content: [
          {
            type: "text",
            text: `Available locales for ${target}:\n${localesList}${namespacesList}`,
          },
        ],
      };
    } catch (error) {
      console.error("❌ ERROR in handleListLocales:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error listing locales: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}

export default new ListLocalesTool();
