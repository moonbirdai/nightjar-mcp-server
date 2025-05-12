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
    this.log(`Parsing embed code: ${embedCode}`);
    
    try {
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
          
          dataElementsArray.forEach((element, index) => {
            if (!element) return;
            
            const matches = element.match(/^"([^"]+)"/);
            if (matches && matches[1]) {
              const name = matches[1];
              dataElements[name] = element;
            }
          });
        }
      } catch (err) {
        this.log("Warning: Error parsing data elements", err);
        dataElements = {};
      }
      
      // Parse rules
      let rules = {
        names: [],
        events: [],
        conditions: [],
        actions: [],
        trackerProperties: [],
        customCode: []
      };
      
      try {
        let rulesSection = launchConfig.split("rules:[")[1];
        if (rulesSection) {
          // Split rules by ID markers
          rulesSection = rulesSection.split("var _satellite=function()")[0];
          const ruleList = [];
          const delimiter = '{"RL';
          const ruleParts = rulesSection.split(delimiter);
          
          for (let i = 1; i < ruleParts.length; i++) {
            if (ruleParts[i]) {
              ruleList.push(delimiter + ruleParts[i]);
            }
          }
          
          // Extract rule components
          ruleList.forEach(rule => {
            try {
              // Extract name
              const nameMatch = rule.match(/name:"([^"]+)"/);
              const name = nameMatch ? nameMatch[1] : "Unknown Rule";
              rules.names.push(name);
              
              // Extract events
              const eventsMatch = rule.match(/events:\[([^\]]+)\]/);
              const events = eventsMatch ? eventsMatch[1] : "";
              // Try to extract event type from path
              const eventPathMatch = events.match(/path:"([^"]+)"/);
              const eventPath = eventPathMatch ? eventPathMatch[1].split('/').pop().split('.')[0] : "Unknown";
              rules.events.push(eventPath);
              
              // Extract conditions
              const conditionsMatch = rule.match(/conditions:\[([^\]]+)\]/);
              const conditions = conditionsMatch ? conditionsMatch[1] : "";
              rules.conditions.push(conditions);
              
              // Extract actions
              const actionsMatch = rule.match(/actions:\[([^\]]+)\]/);
              const actions = actionsMatch ? actionsMatch[1] : "";
              rules.actions.push(actions);
              
              // Extract tracker properties
              const tpMatch = actions.match(/trackerProperties:({[^}]+})/);
              rules.trackerProperties.push(tpMatch ? tpMatch[1] : "");
              
              // Extract custom code
              const ccMatch = actions.match(/customCode\.js[^,]+source:"([^"]+)"/);
              let customCode = "";
              if (ccMatch && ccMatch[1]) {
                if (ccMatch[1].startsWith("http")) {
                  try {
                    // Try to fetch the custom code if it's a URL
                    const ccResponse = await axios.get(ccMatch[1]);
                    customCode = ccResponse.data;
                  } catch (e) {
                    customCode = `Could not fetch custom code from ${ccMatch[1]}`;
                  }
                } else {
                  customCode = ccMatch[1];
                }
              }
              rules.customCode.push(customCode);
            } catch (e) {
              this.log("Warning: Error parsing rule", e);
            }
          });
        }
      } catch (err) {
        this.log("Warning: Error parsing rules", err);
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
  }

  /**
   * Analyze a data element
   */
  async analyzeDataElement(elementName, useAI = true) {
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
  }

  /**
   * Analyze how an Adobe Analytics variable is used
   */
  async analyzeVariable(variableName, useAI = true) {
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
