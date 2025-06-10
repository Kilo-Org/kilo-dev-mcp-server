# i18n MCP Server Developer Guide

This guide is for developers who need to set up, modify, or contribute to the i18n MCP server.

## Codebase Structure

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

To run the i18n tools server:

```bash
# Run only i18n tools
npm run mcp:i18n
```

You can also run the server directly:

```bash
# Run i18n tools
npx tsx src/server.ts i18n
```

The server will start and listen for MCP requests via stdio. When configured in your global MCP configuration as shown in the Setup section of the README, your AI assistant will be able to use the i18n tools automatically.

### Available npm Scripts

```bash
# Run all tools (default)
npm run mcp

# Run only i18n tools
npm run mcp:i18n

# Run only code expert tools
npm run mcp:code-expert

# Run only VSCode extension testing tools
npm run mcp:vscode

# Run tests
npm test

# Build (type check only)
npm run build
```

## Configuration

The server looks for an `.env.local` file in the parent directory for configuration variables:

- `OPENROUTER_API_KEY` - API key for OpenRouter service (required for translation)
- `DEFAULT_MODEL` - Default model to use for translation (defaults to "anthropic/claude-3.7-sonnet")

## Experimental Tools

The server also includes experimental tools that are not part of the core i18n functionality:

### Code Expert Panel Tools
- `query_expert_panel` - Query a panel of LLM experts for opinions on code quality, refactoring suggestions, or architectural decisions

### VSCode Extension Testing Tools
- `launch_dev_extension` - Launch a VSCode extension in development mode with a test prompt
- `stop_dev_extension` - Stop a VSCode extension test by session ID or the currently running test
- `write_prompt_file` - Write a prompt file without launching VSCode (for debugging)

To use these experimental tools, use the appropriate npm script:
- `npm run mcp:code-expert` - Run only code expert tools
- `npm run mcp:vscode` - Run only VSCode extension testing tools
- `npm run mcp` - Run all tools including experimental ones

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.