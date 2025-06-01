# VSCode Extension Testing Tools

This directory contains MCP tools for testing VSCode extensions by launching them in development mode with specific test prompts.

## Tools

### launch_dev_extension

Launches a VSCode extension in development mode with a test prompt.

**Parameters:**
- `workspaceDir` (string): Path to the workspace directory containing the extension
- `prompt` (string): The prompt to execute in the extension

**Note:**
- The extension development path is automatically derived as `<workspaceDir>/src`
- The test directory is automatically derived as `<workspaceDir>/examples`
- This tool blocks until the extension test completes or is explicitly stopped by a call to `stop_dev_extension`

**Example:**
```json
{
  "tool": "launch_dev_extension",
  "arguments": {
    "workspaceDir": "/path/to/my-extension-workspace",
    "prompt": "Create a new TypeScript file with a hello world function"
  }
}
```

### stop_dev_extension

Stops the currently running VSCode extension test and unblocks the waiting `launch_dev_extension` call.

**Parameters:**
None required - stops the most recently launched extension test.

**Example:**
```json
{
  "tool": "stop_dev_extension",
  "arguments": {}
}
```

## How It Works

1. When `launch_dev_extension` is called:
   - A unique session ID is generated
   - The extension path is derived as `<workspaceDir>/src`
   - The test directory is derived as `<workspaceDir>/examples`
   - A `.PROMPT` file is written to the test directory with the prompt and session ID
   - VSCode is launched with the extension in development mode
   - The extension can read the `.PROMPT` file and execute the prompt
   - The tool call blocks and waits for the extension to complete

2. When the extension completes its work:
   - It (or another client) calls `stop_dev_extension`
   - The VSCode process is terminated
   - The `.PROMPT` file is cleaned up
   - Results are returned to both the `stop_dev_extension` caller and the waiting `launch_dev_extension` caller

## Implementation Details

- `extensionManager.ts`: Singleton class that manages the lifecycle of extension test processes
- `types.ts`: Type definitions for the tools
- `launchDevExtension.ts`: Implementation of the launch tool
- `stopDevExtension.ts`: Implementation of the stop tool

## Security Considerations

- All file paths are validated to prevent directory traversal
- Process management includes proper cleanup to prevent resource leaks
- Prompt content is sanitized before writing to disk