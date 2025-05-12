# Nightjar MCP Server

A Model Context Protocol (MCP) server for analyzing Adobe Launch/Tags implementations and embed codes.

## Features

- Parse Adobe Launch embed codes to extract rules, data elements, and variables
- Analyze rules, data elements, and variables to understand their purpose and configuration
- Extract embed codes from website URLs
- AI-powered analysis of implementation components (with OpenAI API key)
- Works seamlessly with Claude Desktop and other MCP clients

## Installation

### Quick Install

Run the installer script:

```bash
curl -sSL https://raw.githubusercontent.com/yourusername/nightjar-mcp-server/main/install.sh | bash
```

### Manual Installation

Install the package globally:

```bash
npm install -g nightjar-mcp-server
```

## Usage with Claude Desktop

After installation, the server will be registered in your Claude Desktop configuration.

1. Restart Claude Desktop
2. Ask Claude to analyze an Adobe Launch implementation:
   - "Can you analyze this Adobe Launch embed code: https://assets.adobedtm.com/launch-..."
   - "What rules are in this website's Adobe Launch implementation: https://example.com"
   - "Analyze the 'addToCart' rule in this embed code: https://assets.adobedtm.com/launch-..."

## Command Line Options

```
nightjar-mcp-server [options]

Options:
  --openai-api-key <string>  OpenAI API Key for AI-powered analysis
  --debug                    Enable debug mode for verbose logging
  --help                     Display help information
```

## Tool Capabilities

The Nightjar MCP Server provides the following tools:

1. **parse_embed_code** - Parse an Adobe Launch embed code directly
   - Input: Adobe Launch embed code URL (e.g., https://assets.adobedtm.com/launch-...)

2. **parse_embed_from_url** - Extract and parse an Adobe Launch embed code from a website URL
   - Input: Website URL (e.g., https://www.example.com)

3. **analyze_rule** - Analyze a specific rule from the parsed embed code
   - Input: Rule name, optional embed code, and AI analysis flag

4. **analyze_data_element** - Analyze a specific data element from the parsed embed code
   - Input: Data element name, optional embed code, and AI analysis flag

5. **analyze_variable** - Analyze how an Adobe Analytics variable is used across rules
   - Input: Variable name (e.g., eVar1, prop5, event10), optional embed code, and AI analysis flag

6. **list_rules** - List all rules found in the Adobe Launch embed code
   - Input: Optional embed code

7. **list_data_elements** - List all data elements found in the Adobe Launch embed code
   - Input: Optional embed code

8. **list_variables** - List all Adobe Analytics variables used in the Launch embed code
   - Input: Optional embed code

## Examples

### Basic Usage

```
# Parse an embed code
parse_embed_code:
  embed_code: "https://assets.adobedtm.com/launch-EN12345.min.js"

# Extract and parse from a URL
parse_embed_from_url:
  url: "https://www.example.com"

# List all rules
list_rules:
  # No parameters needed if you've already parsed an embed code

# Analyze a specific rule
analyze_rule:
  rule_name: "pageLoad"
  use_ai: true
```

### Advanced Analysis with AI

For enhanced analysis using AI (requires OpenAI API key):

```
# Start the server with OpenAI API key
nightjar-mcp-server --openai-api-key YOUR_API_KEY

# Then in Claude, request AI-powered analysis
analyze_rule:
  rule_name: "addToCart"
  use_ai: true
```

## Development

To contribute or customize:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`

## License

MIT
