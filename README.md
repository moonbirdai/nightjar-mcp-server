# Nightjar MCP Server

A Model Context Protocol (MCP) server for analyzing Adobe Launch/Tags implementations and embed codes.

## Features

- Parse Adobe Launch embed codes to extract rules, data elements, and variables
- Analyze rules, data elements, and variables to understand their purpose and configuration
- Extract embed codes from website URLs
- AI-powered analysis of implementation components (with OpenAI API key)
- Works seamlessly with Claude Desktop and other MCP clients

## Recent Fixes

- **Enhanced Rule Parsing**: Completely redesigned rule parsing logic using direct pattern matching to reliably extract rules from Adobe Launch embed codes.
- **Robust Extraction Algorithm**: Now uses targeted pattern recognition to find rules by their ID and name patterns, ensuring reliable extraction even with complex Launch configurations.
- **Improved Data Capture**: Better extraction of rule events, conditions, actions, and custom code.
- **Enhanced Debugging**: Added detailed logging for troubleshooting and diagnostics.

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

## Testing

To run the tests:

```bash
# Test rule extraction with the new approach
node extract-rules.js

# Test the updated NightjarClient implementation
node test-new-approach.js

# Run the original test script
node test-rule-analysis.js
```

## Troubleshooting

If you encounter issues with rule parsing or other functionality:

1. Run with debug mode: `nightjar-mcp-server --debug`
2. Check the logs for errors or warnings
3. Verify that the embed code URL is valid and accessible
4. Test with the included test scripts to verify functionality

## Development

To contribute or customize:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. For debugging, use the dedicated test scripts

## Technical Details

### How Rule Parsing Works

The Nightjar MCP server extracts rules from Adobe Launch embed codes using a completely redesigned approach:

1. Fetches the Launch file using the embed code URL
2. Uses direct pattern matching to find rules by their ID and name patterns
3. Extracts complete rule context for each matched rule
4. Parses rule components (events, conditions, actions, etc.) from the context
5. Creates a structured representation of the rules for analysis

This new approach is more robust and reliable than the previous method, which relied on complex string splitting and could easily break with different Launch configurations.

### Architecture

The server consists of two main components:

1. **NightjarClient class**: Handles parsing and analysis of Adobe Launch embed codes
2. **MCP server**: Exposes Nightjar functionality through the Model Context Protocol

## License

MIT
