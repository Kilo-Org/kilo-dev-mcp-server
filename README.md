# MCP Server

A Model Context Protocol (MCP) server providing tools for internationalization (i18n) translation tasks and code expert panel analysis.

## Overview

This server provides tools for:
1. Managing translations in JSON translation files used by the Kilo Code extension
2. Querying a panel of expert LLM models for code analysis and suggestions

It follows the MCP protocol to interact with the extension via stdio (standard input/output).

## Structure

The codebase is organized as follows:

```
kilo-dev-mcp-server/
├── src/
│   ├── index.ts              # Main entry point, starts the MCP server with all tools
│   ├── server.ts             # Configurable server that can run specific tool sets
│   ├── i18n-server.ts        # Entry point for running only i18n tools
│   ├── code-expert-server.ts # Entry point for running only code expert tools
│   ├── vscode-server.ts      # Entry point for running only VSCode extension testing tools
│   ├── tools/                # MCP tools directory
│   │   ├── types.ts          # Type definitions for tools
│   │   ├── index.ts          # Tool registration
│   │   ├── i18n/             # i18n specific tools
│   │   │   ├── index.ts      # i18n tool exports
│   │   │   ├── listLocales.ts # Tool for listing available locales
│   │   │   ├── moveKey.ts    # Tool for moving keys between files
│   │   │   ├── translateKey.ts # Tool for translating keys
│   │   │   └── translation.ts # Translation utilities
│   │   ├── code-expert/      # Code expert panel tools
│   │   │   ├── queryExpertPanel.ts # Tool for querying expert panel
│   │   │   └── README.md     # Documentation for code expert panel
│   │   └── vscode-extension-testing/ # VSCode extension testing tools
│   │       ├── index.ts      # VSCode extension testing tool exports
│   │       ├── launchDevExtension.ts # Tool for launching dev extensions
│   │       └── stopDevExtension.ts # Tool for stopping dev extensions
│   └── utils/                # Utility functions
│       ├── json-utils.ts     # JSON handling utilities
│       ├── locale-utils.ts   # Locale detection and management
│       └── order-utils.ts    # JSON ordering utilities
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies and scripts
```

## Tools

This server provides the following MCP tools:

### i18n Tools
1. `translate_i18n_key` - Translate a specific key or keys from English to other languages
2. `move_i18n_key` - Move a key from one JSON file to another across all locales
3. `list_locales` - List all available locales

### Code Expert Panel Tools
4. `query_expert_panel` - Query a panel of LLM experts for opinions on code quality, refactoring suggestions, or architectural decisions

### VSCode Extension Testing Tools
5. `launch_dev_extension` - Launch a VSCode extension in development mode with a test prompt
6. `stop_dev_extension` - Stop a VSCode extension test by session ID or the currently running test
7. `write_prompt_file` - Write a prompt file without launching VSCode (for debugging)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- tsx (installed as a dev dependency)

### Setup

1. Install dependencies:

    ```
    npm install
    ```

### Workflow

This server is a simple script that's executed directly via TSX. It doesn't need to be built or started separately. The Kilo Code extension communicates with it via stdio, launching it as a child process when needed for translation tasks.

You can run the server with different tool sets using the following npm scripts:

```bash
# Run all tools (default)
npm run mcp

# Run only i18n tools
npm run mcp:i18n

# Run only code expert tools
npm run mcp:code-expert

# Run only VSCode extension testing tools
npm run mcp:vscode
```

You can also run the server directly with specific tool sets:

```bash
# Run with specific tool sets
npx tsx src/server.ts i18n code-expert

# Run all tools
npx tsx src/server.ts all
```

## Configuration

The server looks for an `.env.local` file in the parent directory for configuration variables:

- `OPENROUTER_API_KEY` - API key for OpenRouter service (required for translation and code expert panel)
- `DEFAULT_MODEL` - Default model to use for translation (defaults to "anthropic/claude-3.7-sonnet")

## Code Expert Panel

The Code Expert Panel tool allows you to query multiple LLM models for their expert opinions on code quality, refactoring suggestions, or architectural decisions.

### Usage

```javascript
// Example MCP tool call
const result = await mcpClient.callTool("query_expert_panel", {
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
});
```

### Default Models

If no models are specified, the tool uses the following default models:

- `deepseek/deepseek-coder-33b-instruct` - DeepSeek coding-focused model with thinking capability
- `openai/o4-mini-high` - OpenAI model with thinking capability
- `google/gemini-2.5-pro-preview` - Google model with thinking capability

For more details, see the [Code Expert Panel documentation](src/tools/code-expert/README.md).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
