#!/bin/bash

# Claude Desktop Setup Script for Nightjar MCP Server

echo "Setting up Nightjar MCP Server for Claude Desktop..."

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CONFIG_DIR="$APPDATA/Claude"
else
    # Linux or other
    echo "Unsupported operating system. Please configure Claude Desktop manually."
    exit 1
fi

CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

# Check for OpenAI API key
OPENAI_API_KEY=${1:-""}

# Build Claude Desktop config
if [ ! -d "$CONFIG_DIR" ]; then
    echo "Creating Claude Desktop config directory: $CONFIG_DIR"
    mkdir -p "$CONFIG_DIR"
fi

# Build command arguments
ARGS_STRING=""
if [ -n "$OPENAI_API_KEY" ]; then
    ARGS_STRING="\"--openai-api-key\", \"$OPENAI_API_KEY\""
fi

# Create or update config file
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Creating new Claude Desktop config file..."
    if [ -n "$ARGS_STRING" ]; then
        echo "{
  \"mcpServers\": {
    \"nightjar\": {
      \"command\": \"nightjar-mcp-server\",
      \"args\": [$ARGS_STRING]
    }
  }
}" > "$CONFIG_FILE"
    else
        echo "{
  \"mcpServers\": {
    \"nightjar\": {
      \"command\": \"nightjar-mcp-server\",
      \"args\": []
    }
  }
}" > "$CONFIG_FILE"
    fi
else
    echo "Updating existing Claude Desktop config file..."
    
    # Check if jq is available
    if command -v jq &> /dev/null; then
        # Use jq to update config
        if [ -n "$ARGS_STRING" ]; then
            jq ".mcpServers[\"nightjar\"] = {\"command\": \"nightjar-mcp-server\", \"args\": [$ARGS_STRING]}" "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
        else
            jq '.mcpServers["nightjar"] = {"command": "nightjar-mcp-server", "args": []}' "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
        fi
        
        if [ $? -eq 0 ]; then
            mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
        else
            echo "Error updating config file with jq. Please update manually."
            exit 1
        fi
    else
        echo "The 'jq' tool is not available. Please manually update your Claude Desktop config file at: $CONFIG_FILE"
        echo "Add the following server configuration:"
        if [ -n "$ARGS_STRING" ]; then
            echo "\"nightjar\": {
  \"command\": \"nightjar-mcp-server\",
  \"args\": [$ARGS_STRING]
}"
        else
            echo "\"nightjar\": {
  \"command\": \"nightjar-mcp-server\",
  \"args\": []
}"
        fi
    fi
fi

echo "Claude Desktop configuration complete!"
echo "Please restart Claude Desktop to use Nightjar MCP Server."
