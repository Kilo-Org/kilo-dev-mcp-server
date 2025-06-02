/**
 * Write Prompt File Tool
 * Just writes a prompt file without launching VSCode (for debugging)
 */

import * as fs from "fs";
import * as path from "path";
import { Context, McpToolCallResponse, ToolHandler } from "../types.js";
// Create a specific type for this tool to avoid confusion with LaunchDevExtensionArgs
interface WritePromptFileArgs {
  launchDir: string;
  prompt: string;
}

/**
 * Tool to write a prompt file without launching VSCode (for debugging)
 */
class WritePromptFileTool implements ToolHandler {
  name = "write_prompt_file";
  description = "Write a prompt file without launching VSCode (for debugging)";
  inputSchema = {
    type: "object",
    properties: {
      launchDir: {
        type: "string",
        description: "Directory to write the prompt file to",
      },
      prompt: {
        type: "string",
        description: "The prompt to write to the file",
      },
    },
    required: ["launchDir", "prompt"],
  };

  /**
   * Execute the tool
   * @param args Tool arguments
   * @param context MCP context
   * @returns Tool response
   */
  async execute(
    args: WritePromptFileArgs,
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
      const { launchDir, prompt } = args;

      // Resolve launch directory path to absolute path if it's relative
      const resolvedLaunchDir = path.resolve(process.cwd(), launchDir);
      process.stderr.write(
        `[WritePromptFile] Resolved launch dir: ${resolvedLaunchDir}\n`
      );

      // Create launch directory if it doesn't exist
      if (!fs.existsSync(resolvedLaunchDir)) {
        fs.mkdirSync(resolvedLaunchDir, { recursive: true });
        process.stderr.write(
          `[WritePromptFile] Created launch directory: ${resolvedLaunchDir}\n`
        );
      }

      // Create prompt file with plain text instructions
      const promptFilePath = path.join(resolvedLaunchDir, ".PROMPT");
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
      const visiblePromptFilePath = path.join(resolvedLaunchDir, "PROMPT.txt");
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
