#!/usr/bin/env node

/**
 * Debug script for Nightjar Rule Parsing
 * Focuses specifically on diagnosing rule parsing issues
 */

import { NightjarClient } from './nightjar-client.js';
import axios from 'axios';

// Use the specified Adobe Launch URL
const TEST_EMBED_URL = 'https://assets.adobedtm.com/cc968521f43d/17f2e229a9a8/launch-26be2a6b5d5f-development.min.js';

// Function to log with a prefix and timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Modified rule parsing function with detailed debugging
async function debugRuleParsing() {
  try {
    log(`Fetching Launch file from ${TEST_EMBED_URL}`);
    const response = await axios.get(TEST_EMBED_URL);
    const launchFile = response.data;
    
    log(`Launch file fetched, size: ${launchFile.length} characters`);
    
    // Check if it's a valid Launch file
    if (!launchFile.includes('window._satellite') && !launchFile.includes('_satellite.container')) {
      throw new Error("The provided URL does not appear to be a valid Adobe Launch embed code");
    }
    
    // Split to get configuration
    const configParts = launchFile.split("window._satellite.container=");
    log(`Found ${configParts.length - 1} container configuration sections`);
    
    if (configParts.length < 2) {
      throw new Error("Could not find container configuration");
    }
    
    const launchConfig = configParts[1];
    log(`Launch config extracted, starts with: ${launchConfig.substring(0, 50)}...`);
    
    // ======= RULES PARSING (PYTHON-STYLE) =======
    log("\n--- RULES PARSING (PYTHON-STYLE) ---");
    
    // Split to get rules section
    const rulesParts = launchConfig.split("rules:[");
    log(`Found ${rulesParts.length - 1} rules section markers`);
    
    if (rulesParts.length < 2) {
      throw new Error("Could not find rules section");
    }
    
    // Get rules section and truncate at the end
    let rulesSection = rulesParts[1];
    const endMarkers = ["var _satellite=function()", "var _satellite="];
    
    let endMarkerFound = false;
    for (const marker of endMarkers) {
      const endIndex = rulesSection.indexOf(marker);
      if (endIndex !== -1) {
        rulesSection = rulesSection.substring(0, endIndex);
        log(`Found end marker: ${marker}`);
        endMarkerFound = true;
        break;
      }
    }
    
    if (!endMarkerFound) {
      log("WARNING: Could not find end marker for rules section");
    }
    
    log(`Rules section extracted, size: ${rulesSection.length} characters`);
    
    // Try Python-style delimiter approach
    const delimiter = '{"RL';
    const ruleParts = rulesSection.split(delimiter);
    log(`Split rules into ${ruleParts.length} parts using delimiter`);
    
    // Create rule list (skipping first part which doesn't contain a rule)
    const ruleList = [];
    for (let i = 1; i < ruleParts.length; i++) {
      if (ruleParts[i]) {
        ruleList.push(delimiter + ruleParts[i]);
      }
    }
    
    log(`Created list with ${ruleList.length} rules`);
    
    // ======= RULES PARSING (JAVASCRIPT-STYLE) =======
    log("\n--- RULES PARSING (JAVASCRIPT-STYLE, from nightjar-client.js) ---");
    
    // Extract rules components
    const rules = {
      names: [],
      events: [],
      conditions: [],
      actions: [],
      trackerProperties: [],
      customCode: []
    };
    
    ruleList.forEach((rule, index) => {
      // Log each rule processing
      log(`Processing rule ${index + 1}, length: ${rule.length} characters`);
      
      try {
        // Extract name using regex
        const nameMatch = rule.match(/name:"([^"]+)"/);
        if (nameMatch) {
          const name = nameMatch[1];
          rules.names.push(name);
          log(`  Rule name (regex): "${name}"`);
        } else {
          log(`  WARNING: Could not extract name with regex`);
          rules.names.push(`Unknown Rule ${index}`);
        }
        
        // Try extracting name using Python-style approach
        try {
          const nameParts = rule.split('name:"');
          if (nameParts.length > 1) {
            const nameEnd = nameParts[1].indexOf('"');
            if (nameEnd !== -1) {
              const namePS = nameParts[1].substring(0, nameEnd);
              log(`  Rule name (python-style): "${namePS}"`);
            }
          }
        } catch (e) {
          log(`  ERROR in python-style name extraction: ${e.message}`);
        }
        
        // Extract events
        const eventsMatch = rule.match(/events:\[([^\]]+)\]/);
        if (eventsMatch) {
          const events = eventsMatch[1];
          log(`  Events section found: ${events.substring(0, 50)}...`);
          
          // Try to extract event type from path
          const eventPathMatch = events.match(/path:"([^"]+)"/);
          if (eventPathMatch) {
            const fullPath = eventPathMatch[1];
            log(`  Event path: ${fullPath}`);
            
            // Extract last part of path
            const pathParts = fullPath.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            
            // Extract event type from filename
            const eventType = lastPart.split('.')[0];
            rules.events.push(eventType);
            log(`  Event type: ${eventType}`);
          } else {
            log(`  WARNING: Could not extract event path`);
            rules.events.push("Unknown");
          }
        } else {
          log(`  WARNING: Could not extract events section`);
          rules.events.push("Unknown");
        }
        
        // Extract conditions
        const conditionsMatch = rule.match(/conditions:\[([^\]]+)\]/);
        if (conditionsMatch) {
          const conditions = conditionsMatch[1];
          log(`  Conditions found: ${conditions.substring(0, 50)}...`);
          rules.conditions.push(conditions);
        } else {
          log(`  WARNING: Could not extract conditions`);
          rules.conditions.push("");
        }
        
        // Extract actions
        const actionsMatch = rule.match(/actions:\[([^\]]+)\]/);
        if (actionsMatch) {
          const actions = actionsMatch[1];
          log(`  Actions found: ${actions.substring(0, 50)}...`);
          rules.actions.push(actions);
          
          // Extract tracker properties
          const tpMatch = actions.match(/trackerProperties:({[^}]+})/);
          if (tpMatch) {
            const tp = tpMatch[1];
            log(`  Tracker properties found: ${tp.substring(0, 50)}...`);
            rules.trackerProperties.push(tp);
          } else {
            log(`  No tracker properties found`);
            rules.trackerProperties.push("");
          }
          
          // Extract custom code
          const ccMatch = actions.match(/customCode\.js[^,]+source:"([^"]+)"/);
          if (ccMatch) {
            const cc = ccMatch[1];
            log(`  Custom code found: ${cc.substring(0, 50)}...`);
            
            if (cc.startsWith("http")) {
              rules.customCode.push(`URL: ${cc} (Use analyze_rule to fetch complete code)`);
            } else {
              rules.customCode.push(cc);
            }
          } else {
            log(`  No custom code found`);
            rules.customCode.push("");
          }
        } else {
          log(`  WARNING: Could not extract actions`);
          rules.actions.push("");
          rules.trackerProperties.push("");
          rules.customCode.push("");
        }
      } catch (e) {
        log(`ERROR processing rule at index ${index}: ${e.message}`);
        log(e.stack);
        
        // Add placeholders for failed rule
        if (rules.names.length <= index) rules.names.push(`Unknown Rule ${index}`);
        if (rules.events.length <= index) rules.events.push("Unknown");
        if (rules.conditions.length <= index) rules.conditions.push("");
        if (rules.actions.length <= index) rules.actions.push("");
        if (rules.trackerProperties.length <= index) rules.trackerProperties.push("");
        if (rules.customCode.length <= index) rules.customCode.push("");
      }
    });
    
    log(`\nParsed ${rules.names.length} rules:`);
    rules.names.forEach((name, index) => {
      log(`  ${index + 1}. ${name}`);
      log(`     Event type: ${rules.events[index]}`);
      log(`     Has conditions: ${rules.conditions[index] ? 'Yes' : 'No'}`);
      log(`     Has tracker properties: ${rules.trackerProperties[index] ? 'Yes' : 'No'}`);
      log(`     Has custom code: ${rules.customCode[index] ? 'Yes' : 'No'}`);
    });
    
    // ======= COMPARE WITH NIGHTJAR CLIENT =======
    log("\n--- COMPARING WITH NIGHTJAR CLIENT PARSER ---");
    
    // Create client with debug mode
    const nightjar = new NightjarClient();
    nightjar.setDebug(true);
    
    try {
      log(`Parsing embed code using NightjarClient...`);
      const parsed = await nightjar.parseEmbed(TEST_EMBED_URL);
      
      const clientRuleCount = parsed.rules.names.length;
      log(`NightjarClient found ${clientRuleCount} rules`);
      
      if (clientRuleCount > 0) {
        log(`Client-parsed rule names: ${parsed.rules.names.join(', ')}`);
      } else {
        log(`WARNING: NightjarClient found 0 rules`);
      }
      
      const dataElementCount = Object.keys(parsed.dataElements || {}).length;
      log(`NightjarClient found ${dataElementCount} data elements`);
      
      const variableCount = Object.keys(parsed.variables || {}).length;
      log(`NightjarClient found ${variableCount} variables`);
    } catch (error) {
      log(`ERROR in NightjarClient parsing: ${error.message}`);
      console.error(error.stack);
    }
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    console.error(error.stack);
  }
}

// Run debugging
debugRuleParsing();
