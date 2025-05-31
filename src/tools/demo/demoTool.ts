import { Context, McpToolCallResponse, ToolHandler } from "../types.js";

/**
 * Demo Tool
 * A simple tool that returns a constant string for testing purposes
 */
class DemoTool implements ToolHandler {
  name = "demo_tool";
  description =
    "A simple tool that returns a constant string for testing purposes";
  inputSchema = {
    type: "object",
    properties: {
      dummy: {
        type: "string",
        description: "Optional dummy parameter",
      },
    },
    required: [],
  };

  async execute(args: any, context: Context): Promise<McpToolCallResponse> {
    process.stderr.write(
      `🔍 DEBUG: Demo tool request received with args: ${JSON.stringify(
        args,
        null,
        2
      )}\n`
    );

    try {
      // Simply return a constant string
      return {
        content: [
          {
            type: "text",
            text: "This is a demo tool response! It always returns this constant string for testing purposes.",
          },
        ],
      };
    } catch (error) {
      process.stderr.write(
        `❌ Error in demo tool: ${
          error instanceof Error ? error.message : String(error)
        }\n`
      );
      return {
        content: [
          {
            type: "text",
            text: `Error in demo tool: ${
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
export default new DemoTool();
