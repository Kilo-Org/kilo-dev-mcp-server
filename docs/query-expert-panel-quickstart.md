# Query Expert Panel MCP Tool - Quick Start Guide

This guide will help you quickly set up and start using the `query_expert_panel` MCP tool, which provides access to a panel of expert LLM models for code analysis, refactoring suggestions, and architectural decisions.

## 1. Prerequisites

Before you begin, make sure you have:

- Node.js (v16 or higher) installed
- An [OpenRouter API key](https://openrouter.ai/) (required for accessing multiple LLM models)
- Git (to clone the repository if you haven't already)

## 2. Environment Setup

### 2.1 Configure Environment Variables

1. Create or edit the `.env.local` file in the root directory of the kilo-dev-mcp-server:

```bash
# Create .env.local file if it doesn't exist
touch kilo-dev-mcp-server/.env.local
```

2. Add your OpenRouter API key to the `.env.local` file:

```
# OpenRouter API key for the query_expert_panel tool
OPENROUTER_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your actual OpenRouter API key.

### 2.2 Install Dependencies

Navigate to the kilo-dev-mcp-server directory and install the required dependencies:

```bash
cd kilo-dev-mcp-server
npm install
```

## 3. Starting the MCP Server

Start the MCP server in development mode:

```bash
npm run dev
```

For automatic reloading when files change, use:

```bash
npm run watch
```

You should see output indicating that the server has started successfully and the `query_expert_panel` tool has been registered.

## 4. Using the Query Expert Panel Tool

### 4.1 Sample Client Script

Here's a simple Node.js script that demonstrates how to call the `query_expert_panel` tool from another application:

```javascript
// sample-client.js
import { McpClient } from "@modelcontextprotocol/sdk"

async function main() {
	try {
		// Create an MCP client connected to the local server
		// The URL should match where your MCP server is running
		const client = new McpClient("stdio://kilo-dev-mcp-server")

		// Connect to the server
		await client.connect()

		console.log("Connected to MCP server")

		// Call the query_expert_panel tool
		const result = await client.callTool("query_expert_panel", {
			code: `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i];
  }
  return total;
}`,
			question: "How can I improve this function for better performance and readability?",
			language: "javascript",
			context: "This function is used in a web application that processes large arrays of numbers.",
		})

		// Display the result
		console.log("Expert Panel Analysis:")
		console.log(result.content[0].text)

		// Disconnect from the server
		await client.disconnect()
	} catch (error) {
		console.error("Error:", error)
	}
}

main()
```

Save this script as `sample-client.js` and run it with:

```bash
node sample-client.js
```

### 4.2 Using with the MCP SDK in a TypeScript Project

For a TypeScript project, you can use the MCP SDK as follows:

```typescript
// sample-client.ts
import { McpClient } from "@modelcontextprotocol/sdk"

interface ExpertPanelParams {
	code: string
	question: string
	language?: string
	context?: string
	models?: string[]
}

async function queryExpertPanel(params: ExpertPanelParams) {
	const client = new McpClient("stdio://kilo-dev-mcp-server")

	try {
		await client.connect()

		const result = await client.callTool("query_expert_panel", params)

		return result.content[0].text
	} finally {
		await client.disconnect()
	}
}

// Example usage
async function main() {
	const analysis = await queryExpertPanel({
		code: `
function processData(data) {
  const results = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].value > 100) {
      results.push(data[i]);
    }
  }
  return results;
}`,
		question: "How can I make this code more maintainable and efficient?",
		language: "javascript",
	})

	console.log(analysis)
}

main().catch(console.error)
```

## 5. Verification Steps

To verify that the tool is working correctly:

1. Start the MCP server:

    ```bash
    cd kilo-dev-mcp-server
    npm run dev
    ```

2. Check the server logs to confirm that the `query_expert_panel` tool is registered without errors.

3. Run the sample client script:

    ```bash
    node sample-client.js
    ```

4. Verify that you receive a properly formatted response with expert opinions from multiple models.

5. Check that the response includes sections from each of the default models (Claude, GPT-4o, and Gemini).

## 6. Troubleshooting

### 6.1 API Key Issues

**Problem**: Error message about missing or invalid OpenRouter API key.

**Solution**:

- Ensure your OpenRouter API key is correctly set in the `.env.local` file
- Verify that the API key is active and has sufficient credits
- Check that the `.env.local` file is being properly loaded (no syntax errors)

### 6.2 Connection Issues

**Problem**: Client cannot connect to the MCP server.

**Solution**:

- Ensure the MCP server is running
- Check that you're using the correct connection URL in your client
- Verify there are no firewall issues blocking the connection

### 6.3 Model Availability Issues

**Problem**: Some models are not responding or returning errors.

**Solution**:

- Check if the specified models are available through OpenRouter
- Verify your OpenRouter subscription includes access to the requested models
- Try using only one model at a time to identify which one is causing issues

### 6.4 Response Formatting Issues

**Problem**: The response is not properly formatted or is incomplete.

**Solution**:

- Check if any models returned error responses
- Verify that all models returned valid Markdown-formatted text
- Try with a simpler code snippet and question to isolate the issue

### 6.5 Rate Limiting Issues

**Problem**: Receiving rate limit errors from OpenRouter.

**Solution**:

- Reduce the number of concurrent requests
- Implement backoff strategies for retries
- Consider upgrading your OpenRouter plan for higher rate limits

## 7. Advanced Usage

### 7.1 Using Custom Models

You can specify which models to use by providing the `models` parameter:

```javascript
const result = await client.callTool("query_expert_panel", {
	code: "...",
	question: "...",
	models: ["anthropic/claude-3-opus", "openai/gpt-4-turbo", "meta/llama-3-70b"],
})
```

### 7.2 Providing Additional Context

For more accurate analysis, provide additional context about your codebase:

```javascript
const result = await client.callTool("query_expert_panel", {
	code: "...",
	question: "...",
	language: "typescript",
	context:
		"This code is part of a React Native application that processes financial data. Performance is critical as it runs on mobile devices with limited resources.",
})
```

## 8. Next Steps

- Explore other MCP tools available in the server
- Integrate the expert panel into your development workflow
- Consider contributing improvements to the tool's implementation

For more information, refer to the [README.md](../src/tools/code-expert/README.md) file in the code-expert directory.
