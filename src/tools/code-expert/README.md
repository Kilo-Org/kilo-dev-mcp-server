# Code Expert Panel MCP Tool

This MCP tool provides access to a panel of expert LLM models for code analysis, refactoring suggestions, and architectural decisions.

## Tool: `query_expert_panel`

Query a panel of LLM experts for opinions on code quality, refactoring suggestions, or architectural decisions.

### Input Schema

```json
{
	"type": "object",
	"properties": {
		"code": {
			"type": "string",
			"description": "The code snippet to analyze"
		},
		"question": {
			"type": "string",
			"description": "The specific question or aspect to analyze about the code"
		},
		"language": {
			"type": "string",
			"description": "The programming language of the code (optional)"
		},
		"context": {
			"type": "string",
			"description": "Additional context about the codebase or requirements (optional)"
		},
		"models": {
			"type": "array",
			"items": {
				"type": "string"
			},
			"description": "Specific models to use (optional, defaults to a predefined set of models)"
		}
	},
	"required": ["code", "question"]
}
```

### Default Models

If no models are specified, the tool uses the following default models:

- `deepseek/deepseek-coder-33b-instruct` - DeepSeek coding-focused model with thinking capability
- `openai/gpt-4-turbo` - More recent OpenAI model with thinking capability
- `google/gemini-2.5-pro-preview` - Google model with thinking capability

### Example Usage

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
})
```

### Response Format

The response combines opinions from all consulted expert models, formatted in Markdown:

```markdown
# Expert Panel Analysis

The following is a combined analysis from multiple AI expert models regarding your code question.

## Expert Opinion from Anthropic Claude 3.7 Sonnet

[Detailed analysis from Claude...]

---

## Expert Opinion from OpenAI GPT-4o

[Detailed analysis from GPT-4o...]

---

## Expert Opinion from Google Gemini 1.5 Pro

[Detailed analysis from Gemini...]
```

### Response Format

The tool returns a response in the following format:

```typescript
{
  content: [
    {
      type: "text",
      text: "# Expert Panel Analysis\n\n[Combined markdown-formatted analysis from all models]"
    }
  ]
}
```

The `text` field contains a markdown-formatted string with the combined analysis from all consulted expert models. The response is structured as follows:

```markdown
# Expert Panel Analysis

The following is a combined analysis from multiple AI expert models regarding your code question.

## Expert Opinion from DeepSeek Coder 33B Instruct

[Detailed analysis from DeepSeek...]

---

## Expert Opinion from OpenAI GPT-4 Turbo

[Detailed analysis from GPT-4 Turbo...]

---

## Expert Opinion from Google Gemini 2.5 Pro Preview

[Detailed analysis from Gemini...]
```

### Use Cases

This tool is particularly useful for:

1. **Code Reviews** - Get multiple expert opinions on code quality and potential improvements
2. **Refactoring Decisions** - Evaluate different approaches to refactoring complex code
3. **Architectural Guidance** - Get insights on architectural decisions from multiple perspectives
4. **Best Practices** - Ensure code follows best practices across different expert opinions
5. **Learning** - Compare different expert explanations to deepen understanding

### Configuration

The tool requires an OpenRouter API key to be set in the environment:

```
OPENROUTER_API_KEY=your_api_key_here
```

This can be set in a `.env.local` file in the root directory of the project.

### Troubleshooting

If you encounter errors when using this tool, check the following:

1. **API Key**: Ensure your OpenRouter API key is correctly set in the `.env.local` file
2. **Required Parameters**: Make sure you're providing both the required parameters (`code` and `question`)
3. **Response Format**: The tool returns a response with a `content` array containing objects with `type` and `text` properties
4. **Model Availability**: If you specify custom models, ensure they are available through OpenRouter

Common error: If you see a ZodError indicating that content is "Required" and "expected: array", but "received: undefined", it means the tool response format doesn't match what's expected. This could happen if you're using an outdated schema or if there's an issue with how the tool is being called.
