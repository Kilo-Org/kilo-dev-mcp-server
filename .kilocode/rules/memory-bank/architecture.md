# Architecture

## MCP Server

- Implemented in `src/index.ts`
- **IMPORTANT: The MCP server starts automatically and should never be manually started**

## Tool System

- Tools in `src/tools/` directory
- Main categories: i18n tools, code expert tools, VSCode extension testing
- Tools registered via `src/tools/index.ts`