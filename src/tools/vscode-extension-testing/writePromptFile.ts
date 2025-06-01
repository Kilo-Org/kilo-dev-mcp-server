/**
 * Write Prompt File Tool
 * Just writes a prompt file without launching VSCode (for debugging)
 */

import * as fs from "fs";
import * as path from "path";
import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
import { LaunchDevExtensionArgs } from "./types.js";

/**
 * Tool to write a prompt file without launching VSCode (for debugging)
 */
class WritePromptFileTool implements ToolHandler {
  name = "write_prompt_file";
  description = "Write a prompt file without launching VSCode (for debugging)";
  inputSchema = {
    type: "object",
    properties: {
      workspaceDir: {
        type: "string",
        description: "Path to the workspace directory",
      },
      prompt: {
        type: "string",
        description: "The prompt to write to the file",
      },
    },
    required: ["workspaceDir", "prompt"],
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
      `[WritePromptFile] Received request with args: ${JSON.stringify(
        args,
        null,
        2
      )}\n`
    );

    try {
      // Validate inputs
      const { workspaceDir, prompt } = args;

      // Resolve workspace path to absolute path if it's relative
      const resolvedWorkspaceDir = path.resolve(process.cwd(), workspaceDir);
      process.stderr.write(
        `[WritePromptFile] Resolved workspace dir: ${resolvedWorkspaceDir}\n`
      );

      // Derive test directory
      const resolvedDir = path.join(resolvedWorkspaceDir, "examples");
      process.stderr.write(
        `[WritePromptFile] Using examples dir: ${resolvedDir}\n`
      );

      // Check if workspace directory exists
      if (!fs.existsSync(resolvedWorkspaceDir)) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workspace directory does not exist: ${resolvedWorkspaceDir}`,
            },
          ],
          isError: true,
        };
      }

      // Create test directory if it doesn't exist
      if (!fs.existsSync(resolvedDir)) {
        fs.mkdirSync(resolvedDir, { recursive: true });
        process.stderr.write(
          `[WritePromptFile] Created test directory: ${resolvedDir}\n`
        );
      }

      // Create prompt file with plain text instructions
      const promptFilePath = path.join(resolvedDir, ".PROMPT");
      process.stderr.write(
        `[WritePromptFile] Writing prompt file to: ${promptFilePath}\n`
      );

      // Generate a fake session ID for the prompt
      const sessionId = `test-${Math.random().toString(36).substring(2, 10)}`;

      // Write the user's prompt and add instructions for stopping the extension
      const promptContent = `${prompt}

---

IMPORTANT: WHEN YOU HAVE COMPLETED THE TASK ABOVE, YOU MUST EXPLICITLY CALL THE FOLLOWING MCP TOOL:

use_mcp_tool(
  server_name: "kilo-dev-mcp-server",
  tool_name: "stop_dev_extension",
  arguments: {
    "sessionId": "${sessionId}"
  }
)

Session ID: ${sessionId}

This will signal that you have finished the task and allow the system to continue.
DO NOT FORGET to call this tool when you are done. The system will remain blocked until you do.`;

      fs.writeFileSync(promptFilePath, promptContent);
      process.stderr.write(
        `[WritePromptFile] Prompt file written successfully\n`
      );

      // Also write a visible copy for debugging
      const visiblePromptFilePath = path.join(resolvedDir, "PROMPT.txt");
      fs.writeFileSync(visiblePromptFilePath, promptContent);
      process.stderr.write(
        `[WritePromptFile] Also wrote visible copy to: ${visiblePromptFilePath}\n`
      );

      return {
        content: [
          {
            type: "text",
            text: `Prompt file written successfully to:\n- ${promptFilePath}\n- ${visiblePromptFilePath} (visible copy)`,
          },
        ],
      };
    } catch (error) {
      process.stderr.write(
        `[WritePromptFile] Error: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
      if (error instanceof Error && error.stack) {
        process.stderr.write(`[WritePromptFile] Stack trace: ${error.stack}\n`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Error writing prompt file: ${
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
export default new WritePromptFileTool();
