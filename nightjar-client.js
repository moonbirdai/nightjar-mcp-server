/**
 * NightjarClient for MCP
 * Parses and analyzes Adobe Launch embed codes
 */

import axios from 'axios';
import { OpenAI } from 'openai';

export class NightjarClient {
  constructor(openAiApiKey = null) {
    this.openAiApiKey = openAiApiKey;
    this.debug = false;
    
    // Store parsed data
    this.parsedEmbed = null;
    
    // Initialize OpenAI client if API key is provided
    if (openAiApiKey) {
      this.openai = new OpenAI({
        apiKey: openAiApiKey
      });
    }
  }

  /**
   * Enable debug logging
   */
  setDebug(debug) {
    this.debug = debug;
    return this;
  }
  
  /**
   * Internal logging function
   */
  log(...args) {
    if (this.debug) {
      console.error(`[${new Date().toISOString()}] [NightjarClient]`, ...args);
    }
  }

  /**
   * Parse an Adobe Launch embed code
   */
  async parseEmbed(embedCode) {
    try {
      this.log(`Parsing embed code: ${embedCode}`);
      
      // Fetch the Launch file
      const response = await axios.get(embedCode);
      const launchFile = response.data;
      
      // Check if it's a valid Launch file
      if (!launchFile.includes('window._satellite') && !launchFile.includes('_satellite.container')) {
        throw new Error("The provided URL does not appear to be a valid Adobe Launch embed code");
      }
      
      // Split the Launch file to isolate the configuration
      let launchConfig;
      try {
        launchConfig = launchFile.split("window._satellite.container=")[1];
        if (!launchConfig) {
          throw new Error("Could not find container configuration");
        }
        this.log(`Launch config extracted, length: ${launchConfig.length} characters`);
      } catch (err) {
        throw new Error("Failed to parse Launch configuration: " + err.message);
      }
      
      // Parse data elements
      let dataElements = {};
      try {
        const dataElementsSection = launchConfig.split("dataElements:{")[1];
        if (dataElementsSection) {
          const dataElementsSplit = dataElementsSection.split("},extensions:{")[0];
          const dataElementsArray = dataElementsSplit.split("}},");
          
          this.log(`Found ${dataElementsArray.length} potential data elements`);
          
          dataElementsArray.forEach((element, index) => {
            if (!element) return;
            
            const matches = element.match(/^"([^"]+)"/);
            if (matches && matches[1]) {
              const name = matches[1];
              dataElements[name] = element;
              this.log(`Parsed data element: ${name}`);
            }
          });
        }
        this.log(`Successfully parsed ${Object.keys(dataElements).length} data elements`);
      } catch (err) {
        this.log("Warning: Error parsing data elements", err);
        dataElements = {};
      }
      
      // Parse rules - NEW APPROACH
      let rules = {
        names: [],
        events: [],
        conditions: [],
        actions: [],
        trackerProperties: [],
        customCode: []
      };
      
      try {
        // NEW: Direct pattern matching for rules in the entire launch file
        const rulePattern = /\{(?:id|"id"):"(RL[^"]+)",(?:name|"name"):"([^"]+)"/g;
        let match;
        let rulesList = [];
        
        this.log('Searching for rules using direct pattern matching...');
        
        // Extract all rules with their surrounding context
        while ((match = rulePattern.exec(launchFile)) !== null) {
          const ruleId = match[1];
          const ruleName = match[2];
          
          // Get context around the match to extract more rule information
          const matchIndex = match.index;
          const contextStart = Math.max(0, matchIndex - 20);
          const contextEnd = Math.min(launchFile.length, matchIndex + 2000); // Extract a good chunk
          const context = launchFile.substring(contextStart, contextEnd);
          
          rulesList.push({
            id: ruleId,
            name: ruleName,
            context: context
          });
          
          this.log(`Found rule: ${ruleName} (${ruleId})`);
        }
        
        this.log(`Extracted ${rulesList.length} rules`);
        
        // Process each rule to extract components
        rulesList.forEach(rule => {
          const ruleContext = rule.context;
          rules.names.push(rule.name);
          
          // Extract event type
          let eventType = "Unknown";
          const eventMatch = ruleContext.match(/events:\[.*?path:"([^"]+)"/);
          if (eventMatch && eventMatch[1]) {
            try {
              const path = eventMatch[1];
              const pathParts = path.split('/');
              const fileName = pathParts[pathParts.length - 1];
              eventType = fileName.split('.')[0];
              this.log(`Rule ${rule.name}: Found event type: ${eventType}`);
            } catch(e) {
              this.log(`Rule ${rule.name}: Failed to extract event type: ${e.message}`);
            }
          }
          rules.events.push(eventType);
          
          // Extract conditions (simplified)
          const hasConditions = ruleContext.includes('conditions:[') && !ruleContext.includes('conditions:[]');
          rules.conditions.push(hasConditions ? "Has conditions" : "");
          
          // Extract actions (simplified)
          const hasActions = ruleContext.includes('actions:[') && !ruleContext.includes('actions:[]');
          const actionText = hasActions ? ruleContext.substring(
            ruleContext.indexOf('actions:['),
            ruleContext.indexOf(']', ruleContext.indexOf('actions:[')) + 1
          ) : "";
          rules.actions.push(actionText);
          
          // Extract tracker properties
          const hasTrackerProps = ruleContext.includes('trackerProperties:');
          let trackerProps = "";
          if (hasTrackerProps) {
            try {
              const tpStart = ruleContext.indexOf('trackerProperties:') + 'trackerProperties:'.length;
              const tpEnd = ruleContext.indexOf('}', tpStart) + 1;
              trackerProps = ruleContext.substring(tpStart, tpEnd);
              this.log(`Rule ${rule.name}: Found tracker properties`);
            } catch(e) {
              this.log(`Rule ${rule.name}: Failed to extract tracker properties: ${e.message}`);
            }
          }
          rules.trackerProperties.push(trackerProps);
          
          // Extract custom code
          const hasCustomCode = ruleContext.includes('customCode.js');
          let customCode = "";
          if (hasCustomCode) {
            try {
              const ccMatch = ruleContext.match(/customCode\.js[^,]+source:"([^"]+)"/);
              if (ccMatch && ccMatch[1]) {
                customCode = ccMatch[1].startsWith("http") ? 
                  `URL: ${ccMatch[1]} (Use analyze_rule to fetch complete code)` : 
                  ccMatch[1];
              }
              this.log(`Rule ${rule.name}: Found custom code`);
            } catch(e) {
              this.log(`Rule ${rule.name}: Failed to extract custom code: ${e.message}`);
            }
          }
          rules.customCode.push(customCode);
        });
        
        this.log(`Successfully processed ${rules.names.length} rules`);
      } catch (err) {
        this.log("Warning: Error parsing rules", err);
        rules = {
          names: [],
          events: [],
          conditions: [],
          actions: [],
          trackerProperties: [],
          customCode: []
        };
      }
      
      // Detect variables used in rules
      const variables = {};
      
      // Function to extract variables from text using regex
      const extractVariables = (text, type, range) => {
        for (let i = 0; i < range; i++) {
          const regex = new RegExp(`${type}${i}\\b`, 'g');
          if (text && regex.test(text)) {
            const variableName = `${type}${i}`;
            if (!variables[variableName]) {
              variables[variableName] = [];
            }
            
            // Find which rules use this variable
            rules.names.forEach((ruleName, index) => {
              const ruleTP = rules.trackerProperties[index] || '';
              const ruleCC = rules.customCode[index] || '';
              const combinedText = ruleTP + ruleCC;
              
              if (combinedText.match(regex) && !variables[variableName].includes(ruleName)) {
                variables[variableName].push(ruleName);
              }
            });
          }
        }
      };
      
      // Extract eVars, props, and events
      rules.trackerProperties.forEach((tp, index) => {
        const cc = rules.customCode[index] || '';
        const combinedText = tp + cc;
        
        // Extract eVars (up to 250)
        extractVariables(combinedText, 'eVar', 251);
        
        // Extract props (up to 75)
        extractVariables(combinedText, 'prop', 76);
        
        // Extract events (up to 1000)
        extractVariables(combinedText, 'event', 1001);
      });
      
      this.log(`Extracted ${Object.keys(variables).length} variables`);
      
      // Create the parsed data structure
      const parsedData = {
        dataElements,
        rules,
        variables
      };
      
      // Store the parsed data for later use
      this.parsedEmbed = parsedData;
      
      return parsedData;
    } catch (error) {
      this.log(`Error parsing embed code: ${error.message}`);
      throw new Error(`Failed to parse embed code: ${error.message}`);
    }
  }

  /**
   * Analyze a rule using the parsed embed data
   */
  async analyzeRule(ruleName, useAI = true) {
    try {
      if (!this.parsedEmbed) {
        throw new Error("Please parse an embed code first using parseEmbed()");
      }
      
      // Find the rule in the parsed data
      const ruleIndex = this.parsedEmbed.rules.names.indexOf(ruleName);
      if (ruleIndex === -1) {
        throw new Error(`Rule '${ruleName}' not found in the parsed embed code`);
      }
      
      // Extract rule details
      const ruleData = {
        name: this.parsedEmbed.rules.names[ruleIndex],
        event: this.parsedEmbed.rules.events[ruleIndex],
        condition: this.parsedEmbed.rules.conditions[ruleIndex],
        action: this.parsedEmbed.rules.actions[ruleIndex],
        trackerProperty: this.parsedEmbed.rules.trackerProperties[ruleIndex],
        customCode: this.parsedEmbed.rules.customCode[ruleIndex]
      };
      
      // Check if we need to fetch the custom code from a URL
      if (ruleData.customCode && ruleData.customCode.startsWith('URL:')) {
        try {
          const urlMatch = ruleData.customCode.match(/URL: (.*?)(?:\s|$)/);
          if (urlMatch && urlMatch[1]) {
            const url = urlMatch[1];
            const response = await axios.get(url);
            ruleData.customCode = response.data;
            // Also update it in the parsed data for future use
            this.parsedEmbed.rules.customCode[ruleIndex] = response.data;
          }
        } catch (e) {
          this.log(`Failed to fetch custom code: ${e.message}`);
          ruleData.customCode += ` (Failed to fetch: ${e.message})`;
        }
      }
      
      if (useAI && this.openAiApiKey && this.openai) {
        // Use OpenAI to analyze the rule
        return this.analyzeWithAI(
          ruleData,
          `Analyze this Adobe Launch rule named "${ruleName}". Explain what it does, when it fires, and any potential concerns or best practices to consider.`
        );
      } else {
        // Return a simple analysis without AI
        return `Rule: ${ruleName}
Event Trigger: ${ruleData.event || 'Unknown'}
Condition: ${this.summarizeCondition(ruleData.condition)}
Action Summary: ${this.summarizeAction(ruleData.action)}
Uses Tracker Properties: ${ruleData.trackerProperty ? 'Yes' : 'No'}
Has Custom Code: ${ruleData.customCode ? 'Yes' : 'No'}

${ruleData.customCode ? `\nCustom Code Preview: \n${ruleData.customCode.substring(0, 200)}${ruleData.customCode.length > 200 ? '...' : ''}` : ''}`;
      }
    } catch (error) {
      this.log(`Error analyzing rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze a data element
   */
  async analyzeDataElement(elementName, useAI = true) {
    try {
      if (!this.parsedEmbed) {
        throw new Error("Please parse an embed code first using parseEmbed()");
      }
      
      // Find the data element in the parsed data
      if (!this.parsedEmbed.dataElements[elementName]) {
        throw new Error(`Data element '${elementName}' not found in the parsed embed code`);
      }
      
      const elementData = this.parsedEmbed.dataElements[elementName];
      
      // Extract data element type and settings
      let elementType = "Unknown";
      let elementSettings = "";
      
      // Try to identify the type
      if (elementData.includes('modulePath:')) {
        const moduleMatch = elementData.match(/modulePath:"([^"]+)"/);
        if (moduleMatch) {
          elementType = moduleMatch[1].split('/').pop();
        }
      }
      
      // Check for common types
      const typeChecks = {
        "constant": /defaultValue/,
        "localStorage": /storageDuration/,
        "customCode": /customCode/,
        "jsVariable": /path:/,
        "domElement": /elementSelector/,
        "cookieValue": /cookieName/
      };
      
      Object.entries(typeChecks).forEach(([type, regex]) => {
        if (regex.test(elementData)) {
          elementType = type;
        }
      });
      
      if (useAI && this.openAiApiKey && this.openai) {
        // Use OpenAI to analyze the data element
        return this.analyzeWithAI(
          { name: elementName, raw: elementData, type: elementType },
          `Analyze this Adobe Launch data element named "${elementName}". Explain what type of data element it is, what data it collects, and any potential concerns or best practices to consider.`
        );
      } else {
        // Return a simple analysis without AI
        return `Data Element: ${elementName}
Type: ${elementType}
Raw Definition: ${elementData.substring(0, 200)}${elementData.length > 200 ? '...' : ''}`;
      }
    } catch (error) {
      this.log(`Error analyzing data element: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze how an Adobe Analytics variable is used
   */
  async analyzeVariable(variableName, useAI = true) {
    try {
      if (!this.parsedEmbed) {
        throw new Error("Please parse an embed code first using parseEmbed()");
      }
      
      // Find the variable in the parsed data
      if (!this.parsedEmbed.variables[variableName]) {
        throw new Error(`Variable '${variableName}' not found in the parsed embed code`);
      }
      
      const usedInRules = this.parsedEmbed.variables[variableName];
      
      // Gather details about where the variable is used
      const usageDetails = usedInRules.map((ruleName, index) => {
        const ruleIndex = this.parsedEmbed.rules.names.indexOf(ruleName);
        if (ruleIndex === -1) return `Rule: ${ruleName} (details not available)`;
        
        const trackerProperty = this.parsedEmbed.rules.trackerProperties[ruleIndex];
        const customCode = this.parsedEmbed.rules.customCode[ruleIndex];
        
        let usageLocation = [];
        if (trackerProperty && trackerProperty.includes(variableName)) {
          usageLocation.push("Tracker Properties");
        }
        if (customCode && customCode.includes(variableName)) {
          usageLocation.push("Custom Code");
        }
        
        return `Rule: ${ruleName}
Usage Location: ${usageLocation.join(', ') || 'Unknown'}
Event Trigger: ${this.parsedEmbed.rules.events[ruleIndex] || 'Unknown'}`;
      });
      
      if (useAI && this.openAiApiKey && this.openai) {
        // Use OpenAI to analyze the variable usage
        return this.analyzeWithAI(
          { 
            name: variableName, 
            usedInRules, 
            usageDetails,
            variableType: variableName.startsWith('eVar') ? 'eVar' : 
                          variableName.startsWith('prop') ? 'prop' : 
                          variableName.startsWith('event') ? 'event' : 'other'
          },
          `Analyze how the Adobe Analytics variable "${variableName}" is used across rules in this implementation. Explain its purpose, what kind of data it likely captures, and any potential concerns or best practices to consider.`
        );
      } else {
        // Return a simple analysis without AI
        return `Variable: ${variableName}
Used in ${usedInRules.length} rules:
${usageDetails.join('\n\n')}`;
      }
    } catch (error) {
      this.log(`Error analyzing variable: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract embed code from an HTML page URL
   */
  async extractEmbedFromUrl(url) {
    this.log(`Extracting embed code from URL: ${url}`);
    try {
      // Fetch the HTML page
      const response = await axios.get(url);
      const html = response.data;
      
      // Extract the Launch embed code using regex
      // Look for both async (recommended) and sync embed codes
      const embedRegexes = [
        /<script.*src=["'](https:\/\/assets\.adobedtm\.com\/[^"']+)["'].*?><\/script>/,
        /<script.*src=["']([^"']+launch[^"']+)["'].*?><\/script>/
      ];
      
      for (const regex of embedRegexes) {
        const match = html.match(regex);
        if (match && match[1]) {
          this.log(`Found embed code: ${match[1]}`);
          return match[1];
        }
      }
      
      throw new Error("No Adobe Launch embed code found on this page");
    } catch (error) {
      this.log(`Error extracting embed code: ${error.message}`);
      throw new Error(`Failed to extract embed code from URL: ${error.message}`);
    }
  }

  /**
   * AI analysis for more detailed insights
   */
  async analyzeWithAI(data, prompt) {
    if (!this.openAiApiKey || !this.openai) {
      throw new Error("OpenAI API key is required for AI analysis");
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system", 
            content: "You are an Adobe Analytics and Adobe Launch expert assistant. Provide detailed, technically accurate analysis of Adobe Launch implementation components."
          },
          {
            role: "user",
            content: `${prompt}\n\nHere is the data to analyze:\n\n${JSON.stringify(data, null, 2)}`
          }
        ],
        temperature: 0.5
      });

      return completion.choices[0].message.content || "No analysis could be generated.";
    } catch (error) {
      this.log(`Error with OpenAI API: ${error.message}`);
      return `AI Analysis Error: ${error.message}. Please check your OpenAI API key and try again.`;
    }
  }

  // Utility function to summarize action data
  summarizeAction(actionData) {
    if (!actionData) return 'No action data';
    
    let summary = [];
    
    // Check for common action types
    if (actionData.includes('s.t(')) {
      summary.push('Fires Adobe Analytics page view tracking call (s.t())');
    }
    
    if (actionData.includes('s.tl(')) {
      summary.push('Fires Adobe Analytics link tracking call (s.tl())');
    }
    
    if (actionData.includes('customCode')) {
      summary.push('Executes custom JavaScript code');
    }
    
    if (actionData.includes('dataLayerPush')) {
      summary.push('Pushes data to data layer');
    }
    
    if (actionData.includes('ruleCondition')) {
      summary.push('Has conditional logic');
    }
    
    return summary.length > 0 ? summary.join(', ') : 'Other action type';
  }

  // Utility function to summarize condition data
  summarizeCondition(conditionData) {
    if (!conditionData || conditionData === "missing component") return 'No conditions (rule always fires)';
    
    let summary = [];
    
    // Check for common condition types
    if (conditionData.includes('pathname')) {
      summary.push('Page path condition');
    }
    
    if (conditionData.includes('hostname')) {
      summary.push('Hostname condition');
    }
    
    if (conditionData.includes('cookie')) {
      summary.push('Cookie value condition');
    }
    
    if (conditionData.includes('querystring')) {
      summary.push('Query string parameter condition');
    }
    
    if (conditionData.includes('dataElement')) {
      summary.push('Data element value condition');
    }
    
    if (conditionData.includes('logicalCondition')) {
      summary.push('Logical operator condition');
    }
    
    return summary.length > 0 ? summary.join(', ') : 'Has conditions';
  }
}