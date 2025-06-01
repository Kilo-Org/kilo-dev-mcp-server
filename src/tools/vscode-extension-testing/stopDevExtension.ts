/**
 * Stop Dev Extension Tool
 * Stops the currently running VSCode extension test
 */

import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { StopDevExtensionArgs, StopResult } from "./types.js";
import { ExtensionManager } from "./extensionManager.js";

/**
 * Tool to stop the currently running VSCode extension test
 */
class StopDevExtensionTool implements ToolHandler {
  name = "stop_dev_extension";
  description =
    "Stop a VSCode extension test by session ID or the currently running test";
  inputSchema = {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description:
          "ID of the session to stop. If not provided, stops the current session.",
      },
    },
    required: [],
  };

  /**
   * Execute the tool
   * @param args Tool arguments (none required)
   * @param context MCP context
   * @returns Tool response
   */
  async execute(
    args: StopDevExtensionArgs,
    context: Context
  ): Promise<McpToolCallResponse> {
    const { sessionId } = args;
    process.stderr.write(
      `[StopDevExtension] Received request${
        sessionId ? ` for session ${sessionId}` : ""
      }\n`
    );

    try {
      // Get extension manager
      const manager = ExtensionManager.getInstance();

      let result: StopResult | undefined;

      if (sessionId) {
        // Stop specific session by ID
        result = await manager.stopSessionById(sessionId);
        if (!result) {
          return {
            content: [
              {
                type: "text",
                text: `No VSCode extension test found with session ID: ${sessionId}. Nothing to stop.`,
              },
            ],
            isError: true,
          };
        }
      } else {
        // Get current session
        const currentSession = manager.getCurrentSession();
        if (!currentSession) {
          return {
            content: [
              {
                type: "text",
                text: "No active VSCode extension test found. Nothing to stop.",
              },
            ],
          };
        }

        // Stop current session
        result = await manager.stopCurrentSession();
      }
      if (!result) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to stop VSCode extension test. No result returned.",
            },
          ],
          isError: true,
        };
      }

      // Format duration as seconds with 2 decimal places
      const durationSeconds = (result.duration / 1000).toFixed(2);

      // Format output and errors for display
      const outputText =
        result.output.length > 0
          ? result.output.join("\n")
          : "No output captured";

      const errorText =
        result.errors.length > 0
          ? `\n\nErrors:\n${result.errors.join("\n")}`
          : "";

      // Combine output and errors
      const resultText = `${outputText}${errorText}`;

      // Truncate if too long
      const maxLength = 1000;
      const truncatedText =
        resultText.length > maxLength
          ? `${resultText.substring(
              0,
              maxLength
            )}...\n(Output truncated, full logs available in the terminal)`
          : resultText;

      return {
        content: [
          {
            type: "text",
            text: `VSCode extension test stopped. Test ran for ${durationSeconds} seconds with exit code ${
              result.exitCode ?? "unknown"
            }.\n\nResults:\n${truncatedText}`,
          },
        ],
      };
    } catch (error) {
      process.stderr.write(
        `[StopDevExtension] Error: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
      if (error instanceof Error && error.stack) {
        process.stderr.write(
          `[StopDevExtension] Stack trace: ${error.stack}\n`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: `Error stopping VSCode extension: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}

// Export the tool
export default new StopDevExtensionTool();
