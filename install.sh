#!/bin/bash

# Install Nightjar MCP Server for Adobe Launch analysis

# Display banner
echo "================================================="
echo "Nightjar MCP Server Installer"
echo "Adobe Launch Implementation Analysis for Claude"
echo "================================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install the package globally
echo "Installing Nightjar MCP Server..."
npm install -g nightjar-mcp-server

# Check if installation succeeded
if [ $? -ne 0 ]; then
    echo "Error: Installation failed. Please check the error messages above."
    exit 1
fi

# Look for Claude Desktop config
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
fi

CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# Check if OpenAI API key was provided
OPENAI_API_KEY=""
echo ""
echo "OpenAI API Key (optional, for AI-powered analysis):"
echo "Press Enter to skip, or paste your key:"
read -r OPENAI_API_KEY

# Build command arguments
ARGS_STRING=""
if [ -n "$OPENAI_API_KEY" ]; then
    ARGS_STRING="\"--openai-api-key\", \"$OPENAI_API_KEY\""
fi

# Configure Claude Desktop if possible
if [ -d "$CLAUDE_CONFIG_DIR" ]; then
    echo "Found Claude Desktop configuration directory."
    
    # Check if config file exists, create if not
    if [ ! -f "$CLAUDE_CONFIG_FILE" ]; then
        echo "Creating Claude Desktop configuration file..."
        echo "{\"mcpServers\":{}}" > "$CLAUDE_CONFIG_FILE"
    fi
    
    # Try to use jq if available for JSON manipulation
    if command -v jq &> /dev/null; then
        # Update existing config using jq
        if [[ "$ARGS_STRING" == "" ]]; then
            # No OpenAI API key
            jq '.mcpServers["nightjar"] = {"command": "nightjar-mcp-server", "args": []}' "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp"
        else
            # With OpenAI API key
            jq ".mcpServers[\"nightjar\"] = {\"command\": \"nightjar-mcp-server\", \"args\": [$ARGS_STRING]}" "$CLAUDE_CONFIG_FILE" > "$CLAUDE_CONFIG_FILE.tmp"
        fi
        
        mv "$CLAUDE_CONFIG_FILE.tmp" "$CLAUDE_CONFIG_FILE"
    else
        # Manual approach if jq is not available
        echo "The 'jq' tool is not installed. Please manually update your Claude Desktop configuration file at:"
        echo "$CLAUDE_CONFIG_FILE"
        echo ""
        echo "Add the following to your configuration:"
        echo ""
        if [[ "$ARGS_STRING" == "" ]]; then
            echo '"nightjar": {
  "command": "nightjar-mcp-server",
  "args": []
}'
        else
            echo "\"nightjar\": {
  \"command\": \"nightjar-mcp-server\",
  \"args\": [$ARGS_STRING]
}"
        fi
    fi
    
    echo "Claude Desktop configuration updated!"
    echo "Please restart Claude Desktop to use Nightjar MCP Server."
else
    echo "Claude Desktop configuration directory not found."
    echo ""
    echo "To use with Claude Desktop, add the following to your claude_desktop_config.json:"
    echo ""
    if [[ "$ARGS_STRING" == "" ]]; then
        echo '{
  "mcpServers": {
    "nightjar": {
      "command": "nightjar-mcp-server",
      "args": []
    }
  }
}'
    else
        echo "{
  \"mcpServers\": {
    \"nightjar\": {
      \"command\": \"nightjar-mcp-server\",
      \"args\": [$ARGS_STRING]
    }
  }
}"
    fi
fi

echo ""
echo "Installation complete!"
echo "You can now use Nightjar to analyze Adobe Launch implementations with Claude."
echo ""
