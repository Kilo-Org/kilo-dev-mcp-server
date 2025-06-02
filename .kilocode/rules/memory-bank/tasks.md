# Tasks

This file documents repetitive tasks that follow similar patterns. Each task includes a description, files that need to be modified, step-by-step procedures, and important considerations.

## Adding a New i18n Tool

### Description
Process for adding a new internationalization (i18n) tool to the MCP server.

### Files to Modify
- `src/tools/i18n/[new-tool-name].ts` - Create the new tool implementation
- `src/tools/i18n/index.ts` - Register the new tool

### Step-by-Step Procedure
1. Create a new TypeScript file in the `src/tools/i18n/` directory
2. Implement the tool following the MCP tool interface pattern
3. Add proper error handling and validation
4. Export the tool from the file
5. Import and register the tool in `src/tools/i18n/index.ts`
6. Add tests in `src/__tests__/tools/i18n/` directory if applicable

### Important Considerations
- Ensure the tool follows the existing patterns for i18n tools
- Include proper input validation
- Handle errors gracefully
- Document the tool's purpose and usage
- Never attempt to start the MCP server manually for testing