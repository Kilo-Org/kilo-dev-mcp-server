#!/usr/bin/env node

/**
 * Code Expert Tools MCP Server
 * Specialized entry point that only includes code expert tools
 */

// Simply re-export the server with the code-expert tool set
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "server.js");

// Start the server with only the code-expert tools
const server = spawn("node", [serverPath, "code-expert"], {
  stdio: "inherit",
});

// Handle server process events
server.on("error", (err) => {
  console.error(`Failed to start code-expert server: ${err.message}`);
  process.exit(1);
});

server.on("exit", (code) => {
  if (code !== 0) {
    console.error(`code-expert server exited with code ${code}`);
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
