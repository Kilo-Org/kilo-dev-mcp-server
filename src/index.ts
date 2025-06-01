#!/usr/bin/env node

/**
 * Simple entry point for MCP stdio script
 * Directly runs the StdioServerTransport handler for MCP tools
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";
import dotenv from "dotenv";

// Import tool handlers
import { getAllTools, getToolByName } from "./tools/index.js";

// Load environment variables from .env.local file
// Try both the current directory and my.env.local if specified
const envPaths = [
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "my.env.local"),
  path.resolve(process.cwd(), "../.env.local"), // Original path as fallback
];

let envResult: dotenv.DotenvConfigOutput = {
  error: new Error("No env file found"),
};
let loadedPath = "";

// Try each path until one works
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    envResult = result;
    loadedPath = envPath;
    break;
  }
}

if (envResult.error) {
  // console.error(`⚠️ Error loading environment variables: ${envResult.error.message}`)
  // console.error(`⚠️ Tried paths: ${envPaths.join(", ")}`)
  // console.error(`⚠️ Will attempt to use environment variables from process.env if available`)
} else {
  // console.error(`✅ Successfully loaded environment variables from: ${loadedPath}`)
}

// Environment variables from MCP config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL || "anthropic/claude-3.7-sonnet";

// Validate API key
if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim() === "") {
  // console.error(`❌ ERROR: OPENROUTER_API_KEY is not set. Real translations will not work!`)
  // console.error(`❌ Please set a valid API key in .env.local or my.env.local or as an environment variable`)
} else {
  // console.error(`✅ OPENROUTER_API_KEY is set (${OPENROUTER_API_KEY.substring(0, 10)}...)`)
}

// Determine the project root path (more reliable approach)
const PROJECT_ROOT = process.cwd().includes("kilo-dev-mcp-server")
  ? path.resolve(process.cwd(), "..")
  : process.cwd();

// Initialize the base paths for locales
const LOCALE_PATHS = {
  core: path.join(PROJECT_ROOT, "src/i18n/locales"),
  webview: path.join(PROJECT_ROOT, "webview-ui/src/i18n/locales"),
};

// Log important paths for debugging
// console.error(`PROJECT_ROOT set to: ${PROJECT_ROOT}`)
// console.error(`Core locales path: ${LOCALE_PATHS.core}`)
// console.error(`Webview locales path: ${LOCALE_PATHS.webview}`)

/**
 * Main MCP handler class
 */
class McpStdioHandler {
  server: Server;

  constructor() {
    // Get all tools for initial configuration
    const allTools = getAllTools();

    // Convert tools to capabilities format
    const toolCapabilities: Record<string, any> = {};

    // Add each tool to the capabilities object
    allTools.forEach((tool) => {
      toolCapabilities[tool.name] = tool;
    });

    this.server = new Server(
      {
        name: "kilo-dev-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: toolCapabilities,
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) =>
      process.stderr.write(`[MCP Error] ${error}\n`);

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // Get all tools for setup
    const allTools = getAllTools();

    // Register available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: allTools,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        // Log the tool call for debugging
        process.stderr.write(`[MCP] Tool call received: ${name}\n`);
        process.stderr.write(
          `[MCP] Arguments: ${JSON.stringify(args, null, 2)}\n`
        );

        // Pass environment variables to handlers
        const context = {
          LOCALE_PATHS,
          OPENROUTER_API_KEY,
          DEFAULT_MODEL,
        };

        // Find the requested tool
        const tool = getToolByName(name);
        if (tool) {
          process.stderr.write(`[MCP] Executing tool: ${name}\n`);

          // Special logging for launch_dev_extension
          if (name === "launch_dev_extension") {
            process.stderr.write(
              `[MCP] Starting launch_dev_extension execution at ${new Date().toISOString()}\n`
            );
          }

          const resultPromise = tool.execute(args, context);

          // Log that we're awaiting the promise
          process.stderr.write(`[MCP] Awaiting Promise from tool: ${name}\n`);

          const result = await resultPromise;

          // Special logging for launch_dev_extension
          if (name === "launch_dev_extension") {
            process.stderr.write(
              `[MCP] Completed launch_dev_extension execution at ${new Date().toISOString()}\n`
            );
          }

          process.stderr.write(`[MCP] Tool execution completed: ${name}\n`);
          return result;
        } else {
          const availableTools = getAllTools()
            .map((t) => t.name)
            .join(", ");
          process.stderr.write(
            `[MCP] Unknown tool: ${name}. Available tools: ${availableTools}\n`
          );
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}. Available tools: ${availableTools}`
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        process.stderr.write(
          `[Error in ${request.params.name}]: ${errorMessage}\n`
        );
        if (error instanceof Error && error.stack) {
          process.stderr.write(`[Stack trace]: ${error.stack}\n`);
        }
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    // console.error("Starting MCP stdio handler...")

    // Create a stdio transport
    const transport = new StdioServerTransport();

    // Set up error handler
    transport.onerror = (error) => {
      process.stderr.write(`[Transport Error] ${error}\n`);
    };

    // Connect the transport to the server
    await this.server.connect(transport);

    // console.error("✅ MCP stdio handler is ready to process requests")

    // Get all tool names for display
    const toolNames = getAllTools()
      .map((t) => t.name)
      .join(", ");

    // console.error(`📝 Available tools: ${toolNames}`)
  }
}

// Initialize and run the handler
const handler = new McpStdioHandler();
handler.run().catch((error) => process.stderr.write(`[Run Error] ${error}\n`));
