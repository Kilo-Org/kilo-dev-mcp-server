#!/usr/bin/env node

/**
 * i18n Tools MCP Server
 * Specialized entry point that only includes i18n tools
 */

// Simply re-export the server with the i18n tool set
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "server.js");

// Start the server with only the i18n tools
const server = spawn("node", [serverPath, "i18n"], {
  stdio: "inherit",
});

// Handle server process events
server.on("error", (err) => {
  console.error(`Failed to start i18n server: ${err.message}`);
  process.exit(1);
});

server.on("exit", (code) => {
  if (code !== 0) {
    console.error(`i18n server exited with code ${code}`);
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
