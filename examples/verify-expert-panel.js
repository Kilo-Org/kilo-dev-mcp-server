#!/usr/bin/env node

/**
 * Verification script for the query_expert_panel MCP tool
 *
 * This script performs a series of checks to verify that:
 * 1. The MCP server can be started
 * 2. The query_expert_panel tool is properly registered
 * 3. The tool can be called with minimal parameters
 * 4. The OpenRouter API key is properly configured
 *
 * Usage:
 *   node verify-expert-panel.js
 */

import { McpClient } from "@modelcontextprotocol/sdk"
import { spawn } from "child_process"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")

// Load environment variables from .env.local
dotenv.config({ path: path.join(rootDir, ".env.local") })

// Minimal code sample for verification
const minimalCode = `
function add(a, b) {
  return a + b;
}
`

// Colors for console output
const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
}

/**
 * Check if the OpenRouter API key is configured
 */
function checkApiKey() {
	console.log(`${colors.blue}[1/4]${colors.reset} Checking OpenRouter API key configuration...`)

	const apiKey = process.env.OPENROUTER_API_KEY

	if (!apiKey) {
		console.error(`${colors.red}❌ Error: OPENROUTER_API_KEY not found in environment variables${colors.reset}`)
		console.error(
			`${colors.yellow}ℹ️  Make sure you have a .env.local file with OPENROUTER_API_KEY set${colors.reset}`,
		)
		return false
	}

	if (apiKey === "your_api_key_here") {
		console.error(
			`${colors.red}❌ Error: OPENROUTER_API_KEY is set to the default placeholder value${colors.reset}`,
		)
		console.error(
			`${colors.yellow}ℹ️  Replace 'your_api_key_here' with your actual OpenRouter API key${colors.reset}`,
		)
		return false
	}

	console.log(`${colors.green}✅ OpenRouter API key is configured${colors.reset}`)
	return true
}

/**
 * Start the MCP server as a child process
 */
function startServer() {
	console.log(`${colors.blue}[2/4]${colors.reset} Starting MCP server...`)

	return new Promise((resolve, reject) => {
		const serverProcess = spawn("npm", ["run", "dev"], {
			cwd: rootDir,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		})

		let serverOutput = ""
		let serverError = ""
		let serverStarted = false

		// Collect stdout
		serverProcess.stdout.on("data", (data) => {
			const output = data.toString()
			serverOutput += output

			// Check if server has started successfully
			if (output.includes("MCP server started") || output.includes("Server listening")) {
				serverStarted = true
				console.log(`${colors.green}✅ MCP server started successfully${colors.reset}`)
				resolve(serverProcess)
			}
		})

		// Collect stderr
		serverProcess.stderr.on("data", (data) => {
			const error = data.toString()
			serverError += error

			// Some servers log to stderr even when starting successfully
			if (error.includes("MCP server started") || error.includes("Server listening")) {
				serverStarted = true
				console.log(`${colors.green}✅ MCP server started successfully${colors.reset}`)
				resolve(serverProcess)
			}
		})

		// Handle server exit
		serverProcess.on("exit", (code) => {
			if (!serverStarted) {
				console.error(`${colors.red}❌ Error: MCP server exited with code ${code}${colors.reset}`)
				console.error(`${colors.yellow}Server stderr:${colors.reset}\n${serverError}`)
				reject(new Error(`Server exited with code ${code}`))
			}
		})

		// Set a timeout in case the server doesn't start
		setTimeout(() => {
			if (!serverStarted) {
				serverProcess.kill()
				console.error(`${colors.red}❌ Error: Timeout waiting for MCP server to start${colors.reset}`)
				console.error(`${colors.yellow}Server output:${colors.reset}\n${serverOutput}`)
				console.error(`${colors.yellow}Server stderr:${colors.reset}\n${serverError}`)
				reject(new Error("Timeout waiting for server to start"))
			}
		}, 10000) // 10 second timeout
	})
}

/**
 * Check if the query_expert_panel tool is registered
 */
async function checkToolRegistration() {
	console.log(`${colors.blue}[3/4]${colors.reset} Checking if query_expert_panel tool is registered...`)

	try {
		const client = new McpClient("stdio://repo-mcp-server")
		await client.connect()

		// Get the list of available tools
		const tools = await client.listTools()
		await client.disconnect()

		// Check if query_expert_panel is in the list
		const expertPanelTool = tools.find((tool) => tool.name === "query_expert_panel")

		if (!expertPanelTool) {
			console.error(`${colors.red}❌ Error: query_expert_panel tool not found in registered tools${colors.reset}`)
			console.error(`${colors.yellow}ℹ️  Available tools: ${tools.map((t) => t.name).join(", ")}${colors.reset}`)
			return false
		}

		console.log(`${colors.green}✅ query_expert_panel tool is registered${colors.reset}`)
		return true
	} catch (error) {
		console.error(`${colors.red}❌ Error checking tool registration: ${error.message}${colors.reset}`)
		return false
	}
}

/**
 * Test the query_expert_panel tool with minimal parameters
 */
async function testTool() {
	console.log(`${colors.blue}[4/4]${colors.reset} Testing query_expert_panel tool with minimal parameters...`)
	console.log(`${colors.yellow}ℹ️  This may take a minute as it queries multiple LLM models...${colors.reset}`)

	try {
		const client = new McpClient("stdio://repo-mcp-server")
		await client.connect()

		// Call the tool with minimal parameters
		const result = await client.callTool("query_expert_panel", {
			code: minimalCode,
			question: "Is this function well-written?",
		})

		await client.disconnect()

		// Check if we got a valid response
		if (!result || !result.content || !result.content[0] || !result.content[0].text) {
			console.error(`${colors.red}❌ Error: Invalid response from query_expert_panel tool${colors.reset}`)
			console.error(`${colors.yellow}ℹ️  Response: ${JSON.stringify(result)}${colors.reset}`)
			return false
		}

		// Check if the response contains expected sections
		const responseText = result.content[0].text

		if (!responseText.includes("Expert Panel Analysis") || !responseText.includes("Expert Opinion from")) {
			console.error(`${colors.red}❌ Error: Response doesn't match expected format${colors.reset}`)
			console.error(`${colors.yellow}ℹ️  Response: ${responseText.substring(0, 200)}...${colors.reset}`)
			return false
		}

		console.log(`${colors.green}✅ Successfully received response from query_expert_panel tool${colors.reset}`)
		console.log(`${colors.cyan}ℹ️  Response preview: ${responseText.substring(0, 100)}...${colors.reset}`)
		return true
	} catch (error) {
		console.error(`${colors.red}❌ Error testing tool: ${error.message}${colors.reset}`)
		return false
	}
}

/**
 * Main verification function
 */
async function verifyExpertPanel() {
	console.log(`${colors.magenta}=== Query Expert Panel Verification ====${colors.reset}`)

	try {
		// Step 1: Check API key
		const apiKeyConfigured = checkApiKey()
		if (!apiKeyConfigured) {
			return false
		}

		// Step 2: Start the server
		const serverProcess = await startServer()

		try {
			// Give the server a moment to fully initialize
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// Step 3: Check tool registration
			const toolRegistered = await checkToolRegistration()
			if (!toolRegistered) {
				return false
			}

			// Step 4: Test the tool
			const toolWorks = await testTool()
			if (!toolWorks) {
				return false
			}

			console.log(`\n${colors.green}✅ All verification checks passed!${colors.reset}`)
			console.log(`${colors.green}✅ The query_expert_panel tool is working correctly.${colors.reset}`)
			return true
		} finally {
			// Clean up: kill the server process
			if (serverProcess) {
				console.log(`${colors.blue}ℹ️  Stopping MCP server...${colors.reset}`)
				serverProcess.kill()
			}
		}
	} catch (error) {
		console.error(`${colors.red}❌ Verification failed: ${error.message}${colors.reset}`)
		return false
	}
}

// Run the verification
verifyExpertPanel()
	.then((success) => {
		process.exit(success ? 0 : 1)
	})
	.catch((error) => {
		console.error(`${colors.red}❌ Unexpected error: ${error.message}${colors.reset}`)
		process.exit(1)
	})
