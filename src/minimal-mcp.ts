#!/usr/bin/env node

/**
 * Minimal MCP server for testing
 * No logging to stdout to avoid interfering with MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// Demo tool definition
const demoTool = {
  name: "demo_tool",
  description:
    "A simple tool that returns a constant string for testing purposes",
  inputSchema: {
    type: "object",
    properties: {
      dummy: {
        type: "string",
        description: "Optional dummy parameter",
      },
    },
    required: [],
  },
  execute: async (args: any) => {
    // No logging, just return the response
    return {
      content: [
        {
          type: "text",
          text: "This is a demo tool response! 333 It always returns this constant string for testing purposes.",
        },
      ],
    };
  },
};

// Initialize server
const server = new Server(
  {
    name: "minimal-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {
        [demoTool.name]: {
          description: demoTool.description,
          inputSchema: demoTool.inputSchema,
        },
      },
    },
  }
);

// Set up request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: demoTool.name,
      description: demoTool.description,
      inputSchema: demoTool.inputSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (name === demoTool.name) {
      return await demoTool.execute(args);
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Connect to STDIO transport
const transport = new StdioServerTransport();
server.connect(transport).catch((error) => {
  process.stderr.write(`Error connecting to transport: ${error}\n`);
  process.exit(1);
});

// Handle SIGINT
process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});
