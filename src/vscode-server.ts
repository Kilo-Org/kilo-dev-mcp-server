#!/usr/bin/env node

/**
 * VSCode Extension Testing Tools MCP Server
 * Specialized entry point that only includes VSCode extension testing tools
 */

// Simply re-export the server with the vscode tool set
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "server.js");

// Start the server with only the vscode extension testing tools
const server = spawn("node", [serverPath, "vscode"], {
  stdio: "inherit",
});

// Handle server process events
server.on("error", (err) => {
  console.error(
    `Failed to start vscode-extension-testing server: ${err.message}`
  );
  process.exit(1);
});

server.on("exit", (code) => {
  if (code !== 0) {
    console.error(`vscode-extension-testing server exited with code ${code}`);
    process.exit(code || 1);
  }
  process.exit(0);
});

// Forward signals to the child process
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    server.kill();
  });
});
