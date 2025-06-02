/**
 * Launch Dev Extension Tool
 * Launches a VSCode extension in development mode with a test prompt
 */

import * as fs from "fs";
import * as path from "path";
import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { LaunchDevExtensionArgs } from "./types.js";
import { ExtensionManager } from "./extensionManager.js";

/**
 * Tool to launch a VSCode extension in development mode with a test prompt
 */
class LaunchDevExtensionTool implements ToolHandler {
  name = "launch_dev_extension";
  description =
    "Launch a VSCode extension in development mode with a test prompt";
  inputSchema = {
    type: "object",
    properties: {
      extensionPath: {
        type: "string",
        description: "Path to the extension development directory",
      },
      prompt: {
        type: "string",
        description: "The prompt to execute in the extension",
      },
      launchDir: {
        type: "string",
        description:
          "Directory to open Visual Studio Code in and write the prompt to",
      },
    },
    required: ["extensionPath", "prompt", "launchDir"],
  };

  /**
   * Execute the tool
   * @param args Tool arguments
   * @param context MCP context
   * @returns Tool response
   */
  async execute(
    args: LaunchDevExtensionArgs,
    context: Context
  ): Promise<McpToolCallResponse> {
    process.stderr.write(
      `[LaunchDevExtension] Received request with args: ${JSON.stringify(
        args,
        null,
        2
      )}\n`
    );

    try {
      // Validate inputs
      const { extensionPath, prompt, launchDir } = args;

      // Resolve paths to absolute paths if they're relative
      const resolvedExtensionPath = path.resolve(process.cwd(), extensionPath);
      const resolvedLaunchDir = path.resolve(process.cwd(), launchDir);

      // Check if extension path exists
      if (!fs.existsSync(resolvedExtensionPath)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Extension path does not exist: ${resolvedExtensionPath}`,
            },
          ],
          isError: true,
        };
      }

      // Create launch directory if it doesn't exist
      if (!fs.existsSync(resolvedLaunchDir)) {
        fs.mkdirSync(resolvedLaunchDir, { recursive: true });
        process.stderr.write(
          `[LaunchDevExtension] Created launch directory: ${resolvedLaunchDir}\n`
        );
      }

      // Get extension manager
      const manager = ExtensionManager.getInstance();

      // Launch extension
      process.stderr.write(
        `[LaunchDevExtension] About to launch extension at path: ${resolvedExtensionPath}\n`
      );
      process.stderr.write(
        `[LaunchDevExtension] Using launch directory: ${resolvedLaunchDir}\n`
      );

      const sessionId = await manager.launchExtension(
        resolvedExtensionPath,
        prompt,
        resolvedLaunchDir
      );

      process.stderr.write(
        `[LaunchDevExtension] Extension launched with session ID: ${sessionId}. Waiting for completion...\n`
      );

      // Wait for the extension process to complete
      try {
        // This will block until stopDevExtension is called or the process exits
        process.stderr.write(
          `[LaunchDevExtension] Calling waitForSessionCompletion for session: ${sessionId}\n`
        );

        // This Promise will not resolve until stopDevExtension is explicitly called
        // or the process exits unexpectedly
        const result = await manager.waitForSessionCompletion(sessionId);

        process.stderr.write(
          `[LaunchDevExtension] waitForSessionCompletion resolved for session: ${sessionId}\n`
        );

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
              text: `VSCode extension test completed in ${durationSeconds} seconds with exit code ${
                result.exitCode ?? "unknown"
              }.\n\nResults:\n${truncatedText}`,
            },
          ],
        };
      } catch (error) {
        process.stderr.write(
          `[LaunchDevExtension] Error waiting for completion: ${error}\n`
        );
        return {
          content: [
            {
              type: "text",
              text: `Error waiting for VSCode extension test to complete: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      process.stderr.write(
        `[LaunchDevExtension] Error: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
      if (error instanceof Error && error.stack) {
        process.stderr.write(
          `[LaunchDevExtension] Stack trace: ${error.stack}\n`
        );
      }

      return {
        content: [
          {
            type: "text",
            text: `Error launching VSCode extension: ${
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
export default new LaunchDevExtensionTool();
