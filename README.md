# Internationalization (i18n) MCP Server

A Model Context Protocol (MCP) server providing tools for internationalization (i18n) translation tasks.

## Overview

This server provides tools for managing translations in JSON translation files used by the Kilo Code extension. It follows the MCP protocol to interact with the extension via stdio (standard input/output).

The server is designed to be modular, allowing you to run just the i18n tools independently from other experimental tools.

## i18n Tools

This server provides the following internationalization MCP tools:

1. `translate_i18n_key` - Translate a specific key or keys from English to other languages
2. `move_i18n_key` - Move a key from one JSON file to another across all locales
3. `list_locales` - List all available locales
4. `remove_i18n_keys` - Remove specified keys from all locale files across all languages

## Setup

To use the i18n MCP server with your AI assistant, you need to configure it in your global MCP configuration. Add the following to your configuration:

```json
{
  "mcpServers": {
    "kilo-dev-mcp-server": {
      "type": "stdio",
      "command": "/bin/bash",
      "args": [
        "-c",
        "cd /path/to/kilo-dev-mcp-server && npm run mcp:i18n"
      ],
      "env": {
        "OPENROUTER_API_KEY": "${env:OPENROUTER_API_KEY}"
      },
      "timeout": 3600,
      "alwaysAllow": [
        "translate_i18n_key",
        "list_locales",
        "remove_i18n_keys",
        "move_i18n_key"
      ],
      "disabled": false
    }
  }
}
```

Make sure to replace `/path/to/kilo-dev-mcp-server` with the actual path to your kilo-dev-mcp-server directory.

## Configuration

The server requires an OpenRouter API key for translation functionality:

- `OPENROUTER_API_KEY` - API key for OpenRouter service (required for translation)
- `DEFAULT_MODEL` - Default model to use for translation (defaults to "anthropic/claude-3.7-sonnet")

You can set these in your environment or in an `.env.local` file.

## How to Use

Once you've set up the MCP server configuration, you can use the i18n tools by simply prompting your AI assistant. The AI will automatically use the appropriate tool based on your request.

### Example Prompts

Here are some examples of how to prompt the AI to use the i18n tools:

#### Translating Keys

```
Please translate the "welcome.message" key in the common.json to all other supported languages.
```

The AI will automatically:
1. Determine that this is a translation request
2. Identify that it's for the "core" target
3. Use the translate_i18n_key tool to perform the translation

#### Listing Available Locales

```
What locales are currently supported in our project's webview UI?
```

The AI will use the list_locales tool to show all available locales for the webview UI.

#### Moving Keys Between Files

```
Please move the "errorMessages.notFound" key from errors.json to common.json in the package locales.
```

The AI will use the move_i18n_key tool to move the key across all locale files.

#### Removing Obsolete Keys

```
Please remove the obsolete keys "oldFeature.title" and "oldFeature.description" from the features.json file in the core locales.
```

The AI will use the remove_i18n_keys tool to remove these keys from all locale files.

## Developer Documentation

For developers who need to set up, modify, or contribute to this project, please see the [Developer Guide](DEV_GUIDE.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
