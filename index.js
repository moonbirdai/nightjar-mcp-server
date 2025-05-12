#!/usr/bin/env node

/**
 * Nightjar MCP Server
 * A Model Context Protocol server for analyzing Adobe Launch embed codes
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { Command } from 'commander';
import { NightjarClient } from './nightjar-client.js';

// Parse command line arguments
const program = new Command();
program
  .name('nightjar-mcp-server')
  .description('MCP server for analyzing Adobe Launch embed codes')
  .version('1.0.0')
  .option('--openai-api-key <string>', 'OpenAI API Key for AI-powered analysis')
  .option('--debug', 'Enable debug mode for verbose logging', false)
  .parse();

const options = program.opts();
const openAiApiKey = options.openaiApiKey;
const debug = options.debug;

// Debug logging function
function log(...args) {
  if (debug) {
    console.error(`[${new Date().toISOString()}]`, ...args);
  }
}

log(`Initializing Nightjar MCP server${openAiApiKey ? ' with OpenAI API key' : ''}`);

// Tool definitions
const tools = [
  {
    name: "parse_embed_code",
    description: "Parse an Adobe Launch embed code directly",
    inputSchema: {
      type: "object",
      properties: {
        embed_code: { 
          type: "string", 
          description: "The Adobe Launch embed code URL to parse (e.g., https://assets.adobedtm.com/launch-..."
        }
      },
      required: ["embed_code"]
    }
  },
  {
    name: "parse_embed_from_url",
    description: "Extract and parse an Adobe Launch embed code from a website URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { 
          type: "string", 
          description: "The URL of the webpage to analyze for Adobe Launch implementation"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "analyze_rule",
    description: "Analyze a specific rule from the parsed Adobe Launch embed code",
    inputSchema: {
      type: "object",
      properties: {
        rule_name: { 
          type: "string", 
          description: "The name of the rule to analyze"
        },
        embed_code: { 
          type: "string", 
          description: "The embed code to parse (optional if you've already called parse_embed_code)"
        },
        use_ai: {
          type: "boolean",
          description: "Whether to use AI for enhanced analysis (requires OpenAI API key)"
        }
      },
      required: ["rule_name"]
    }
  },
  {
    name: "analyze_data_element",
    description: "Analyze a specific data element from the parsed Adobe Launch embed code",
    inputSchema: {
      type: "object",
      properties: {
        element_name: { 
          type: "string", 
          description: "The name of the data element to analyze"
        },
        embed_code: { 
          type: "string", 
          description: "The embed code to parse (optional if you've already called parse_embed_code)"
        },
        use_ai: {
          type: "boolean",
          description: "Whether to use AI for enhanced analysis (requires OpenAI API key)"
        }
      },
      required: ["element_name"]
    }
  },
  {
    name: "analyze_variable",
    description: "Analyze how an Adobe Analytics variable is used across rules",
    inputSchema: {
      type: "object",
      properties: {
        variable_name: { 
          type: "string", 
          description: "The name of the variable to analyze (e.g., eVar1, prop5, event10)"
        },
        embed_code: { 
          type: "string", 
          description: "The embed code to parse (optional if you've already called parse_embed_code)"
        },
        use_ai: {
          type: "boolean",
          description: "Whether to use AI for enhanced analysis (requires OpenAI API key)"
        }
      },
      required: ["variable_name"]
    }
  },
  {
    name: "list_rules",
    description: "List all rules found in the Adobe Launch embed code",
    inputSchema: {
      type: "object",
      properties: {
        embed_code: { 
          type: "string", 
          description: "The embed code to parse (optional if you've already called parse_embed_code)"
        }
      }
    }
  },
  {
    name: "list_data_elements",
    description: "List all data elements found in the Adobe Launch embed code",
    inputSchema: {
      type: "object",
      properties: {
        embed_code: { 
          type: "string", 
          description: "The embed code to parse (optional if you've already called parse_embed_code)"
        }
      }
    }
  },
  {
    name: "list_variables",
    description: "List all Adobe Analytics variables used in the Launch embed code",
    inputSchema: {
      type: "object",
      properties: {
        embed_code: { 
          type: "string", 
          description: "The embed code to parse (optional if you've already called parse_embed_code)"
        }
      }
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: "nightjar-adobe-launch",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize Nightjar client
const nightjar = new NightjarClient(openAiApiKey);
nightjar.setDebug(debug);

// Register tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('Received list_tools request');
  return { tools };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    log(`Received call_tool request for: ${name}`);
    
    let result;
    
    switch (name) {
      case "parse_embed_code": {
        if (!args.embed_code) {
          throw new Error("Missing required parameter: embed_code");
        }
        
        log(`Parsing embed code: ${args.embed_code}`);
        
        try {
          const parsedData = await nightjar.parseEmbed(args.embed_code);
          
          // Format for human readability
          result = `Successfully parsed Adobe Launch implementation!

Found ${parsedData.dataElements ? Object.keys(parsedData.dataElements).length : 0} data elements
Found ${parsedData.rules.names.length} rules
Detected variables: ${Object.keys(parsedData.variables || {}).join(', ')}

You can now use other tools like analyze_rule, analyze_data_element, or analyze_variable to explore the implementation.`;
        } catch (error) {
          throw new Error(`Failed to parse embed code: ${error.message}`);
        }
        break;
      }
      
      case "parse_embed_from_url": {
        if (!args.url) {
          throw new Error("Missing required parameter: url");
        }
        
        log(`Extracting embed code from URL: ${args.url}`);
        
        try {
          // First extract the embed code from the URL
          const embedCode = await nightjar.extractEmbedFromUrl(args.url);
          
          // Then parse it
          const parsedData = await nightjar.parseEmbed(embedCode);
          
          // Format for human readability
          result = `Successfully parsed Adobe Launch implementation from ${args.url}!

Found embed code: ${embedCode}
Found ${parsedData.dataElements ? Object.keys(parsedData.dataElements).length : 0} data elements
Found ${parsedData.rules.names.length} rules
Detected variables: ${Object.keys(parsedData.variables || {}).join(', ')}

You can now use other tools like analyze_rule, analyze_data_element, or analyze_variable to explore the implementation.`;
        } catch (error) {
          throw new Error(`Failed to extract/parse embed code from URL: ${error.message}`);
        }
        break;
      }
      
      case "analyze_rule": {
        if (!args.rule_name) {
          throw new Error("Missing required parameter: rule_name");
        }
        
        // If embed_code is provided, parse it first
        if (args.embed_code) {
          await nightjar.parseEmbed(args.embed_code);
        } else if (!nightjar.parsedEmbed) {
          throw new Error("No embed code has been parsed yet. Please call parse_embed_code first or provide embed_code.");
        }
        
        log(`Analyzing rule: ${args.rule_name}`);
        
        const useAI = args.use_ai === true && openAiApiKey;
        
        try {
          result = await nightjar.analyzeRule(args.rule_name, useAI);
        } catch (error) {
          throw new Error(`Failed to analyze rule: ${error.message}`);
        }
        break;
      }
      
      case "analyze_data_element": {
        if (!args.element_name) {
          throw new Error("Missing required parameter: element_name");
        }
        
        // If embed_code is provided, parse it first
        if (args.embed_code) {
          await nightjar.parseEmbed(args.embed_code);
        } else if (!nightjar.parsedEmbed) {
          throw new Error("No embed code has been parsed yet. Please call parse_embed_code first or provide embed_code.");
        }
        
        log(`Analyzing data element: ${args.element_name}`);
        
        const useAI = args.use_ai === true && openAiApiKey;
        
        try {
          result = await nightjar.analyzeDataElement(args.element_name, useAI);
        } catch (error) {
          throw new Error(`Failed to analyze data element: ${error.message}`);
        }
        break;
      }
      
      case "analyze_variable": {
        if (!args.variable_name) {
          throw new Error("Missing required parameter: variable_name");
        }
        
        // If embed_code is provided, parse it first
        if (args.embed_code) {
          await nightjar.parseEmbed(args.embed_code);
        } else if (!nightjar.parsedEmbed) {
          throw new Error("No embed code has been parsed yet. Please call parse_embed_code first or provide embed_code.");
        }
        
        log(`Analyzing variable: ${args.variable_name}`);
        
        const useAI = args.use_ai === true && openAiApiKey;
        
        try {
          result = await nightjar.analyzeVariable(args.variable_name, useAI);
        } catch (error) {
          throw new Error(`Failed to analyze variable: ${error.message}`);
        }
        break;
      }
      
      case "list_rules": {
        // If embed_code is provided, parse it first
        if (args.embed_code) {
          await nightjar.parseEmbed(args.embed_code);
        } else if (!nightjar.parsedEmbed) {
          throw new Error("No embed code has been parsed yet. Please call parse_embed_code first or provide embed_code.");
        }
        
        log('Listing rules');
        
        const rules = nightjar.parsedEmbed.rules.names;
        
        if (!rules || rules.length === 0) {
          result = "No rules found in the parsed embed code.";
        } else {
          result = `Found ${rules.length} rules:\n\n${rules.join('\n')}`;
        }
        break;
      }
      
      case "list_data_elements": {
        // If embed_code is provided, parse it first
        if (args.embed_code) {
          await nightjar.parseEmbed(args.embed_code);
        } else if (!nightjar.parsedEmbed) {
          throw new Error("No embed code has been parsed yet. Please call parse_embed_code first or provide embed_code.");
        }
        
        log('Listing data elements');
        
        const dataElements = nightjar.parsedEmbed.dataElements;
        
        if (!dataElements || Object.keys(dataElements).length === 0) {
          result = "No data elements found in the parsed embed code.";
        } else {
          result = `Found ${Object.keys(dataElements).length} data elements:\n\n${Object.keys(dataElements).join('\n')}`;
        }
        break;
      }
      
      case "list_variables": {
        // If embed_code is provided, parse it first
        if (args.embed_code) {
          await nightjar.parseEmbed(args.embed_code);
        } else if (!nightjar.parsedEmbed) {
          throw new Error("No embed code has been parsed yet. Please call parse_embed_code first or provide embed_code.");
        }
        
        log('Listing variables');
        
        const variables = nightjar.parsedEmbed.variables;
        
        if (!variables || Object.keys(variables).length === 0) {
          result = "No variables found in the parsed embed code.";
        } else {
          // Group variables by type
          const eVars = Object.keys(variables).filter(v => v.startsWith('eVar'));
          const props = Object.keys(variables).filter(v => v.startsWith('prop'));
          const events = Object.keys(variables).filter(v => v.startsWith('event'));
          const others = Object.keys(variables).filter(v => !v.startsWith('eVar') && !v.startsWith('prop') && !v.startsWith('event'));
          
          result = `Found ${Object.keys(variables).length} variables in the parsed embed code:

eVars (${eVars.length}): ${eVars.join(', ')}
Props (${props.length}): ${props.join(', ')}
Events (${events.length}): ${events.join(', ')}${others.length > 0 ? `\nOthers (${others.length}): ${others.join(', ')}` : ''}`;
        }
        break;
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    log(`Error in call_tool: ${error.message}`);
    
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start the server
async function runServer() {
  try {
    // Create transport for stdio
    log('Initializing stdio transport');
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    log('Starting MCP server...');
    await server.connect(transport);
    
    log('Nightjar MCP Server is running via stdio');
  } catch (error) {
    log(`Fatal error starting server: ${error.message}`);
    process.exit(1);
  }
}

// Handle errors and termination
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  log(error.stack);
  process.exit(1);
});

// Run the server
runServer().catch((error) => {
  log(`Fatal error: ${error.message}`);
  log(error.stack);
  process.exit(1);
});
