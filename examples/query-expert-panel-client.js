#!/usr/bin/env node

/**
 * Example client for the query_expert_panel MCP tool
 *
 * This script demonstrates how to connect to the MCP server and use the
 * query_expert_panel tool to get expert opinions on code.
 *
 * Usage:
 *   node query-expert-panel-client.js
 *
 * Make sure the MCP server is running before executing this script.
 */

import { McpClient } from "@modelcontextprotocol/sdk"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Sample code to analyze
const sampleCode = `
function processUserData(users) {
  let activeUsers = [];
  let inactiveUsers = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.status === 'active') {
      activeUsers.push(user);
    } else {
      inactiveUsers.push(user);
    }
  }
  
  return {
    active: activeUsers,
    inactive: inactiveUsers,
    totalActive: activeUsers.length,
    totalInactive: inactiveUsers.length,
    total: users.length
  };
}
`

async function main() {
	console.log("🚀 Starting query_expert_panel client example")

	try {
		// Create an MCP client connected to the local server
		console.log("📡 Connecting to MCP server...")
		const client = new McpClient("stdio://kilo-dev-mcp-server")

		// Connect to the server
		await client.connect()
		console.log("✅ Connected to MCP server")

		// Call the query_expert_panel tool
		console.log("🔍 Querying expert panel...")
		console.log("⏳ This may take a minute as multiple models are being consulted...")

		const result = await client.callTool("query_expert_panel", {
			code: sampleCode,
			question: "How can I refactor this function to be more maintainable and use modern JavaScript features?",
			language: "javascript",
			context: "This function is part of a user management system in a web application.",
		})

		// Display the result
		console.log("\n📊 Expert Panel Analysis:")
		console.log("======================\n")
		console.log(result.content[0].text)

		// Save the result to a file
		const outputPath = path.join(__dirname, "expert-panel-result.md")
		fs.writeFileSync(outputPath, result.content[0].text)
		console.log(`\n💾 Result saved to ${outputPath}`)

		// Disconnect from the server
		await client.disconnect()
		console.log("👋 Disconnected from MCP server")
	} catch (error) {
		console.error("❌ Error:", error)
		process.exit(1)
	}
}

main()
