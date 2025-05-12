#!/usr/bin/env node

/**
 * Refined solution for rule parsing in Nightjar MCP Server
 * This version takes a different approach to find and extract rules
 */

import axios from 'axios';

// Test embed code URL
const TEST_EMBED_URL = 'https://assets.adobedtm.com/cc968521f43d/17f2e229a9a8/launch-26be2a6b5d5f-development.min.js';

// Function to log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// This approach uses a more targeted extraction pattern
async function extractRules() {
  try {
    log(`Fetching Launch file from ${TEST_EMBED_URL}`);
    
    // Fetch the Launch file
    const response = await axios.get(TEST_EMBED_URL);
    const launchFile = response.data;
    
    log(`Launch file fetched, size: ${launchFile.length} bytes`);
    
    // Different approach: Look for the pattern that starts each rule
    // Rules in Launch files often have a pattern like {id:"RL1234",name:"Rule Name",...
    log("\nTrying direct rule extraction approach:");
    
    // Pattern to look for rule definitions
    // This is a more specific pattern looking for rule IDs in the format "RL..."
    const rulePattern = /\{(?:id|"id"):"(RL[^"]+)",(?:name|"name"):"([^"]+)"/g;
    
    let foundRules = [];
    let match;
    
    // Find all matches of rule patterns
    while ((match = rulePattern.exec(launchFile)) !== null) {
      const ruleId = match[1];
      const ruleName = match[2];
      const fullMatch = match[0];
      
      // Get some context around the match
      const matchIndex = match.index;
      const contextStart = Math.max(0, matchIndex - 20);
      const contextEnd = Math.min(launchFile.length, matchIndex + fullMatch.length + 100);
      const context = launchFile.substring(contextStart, contextEnd);
      
      log(`Found rule: ${ruleName} (${ruleId})`);
      log(`Match context: ${context.substring(0, 30)}...`);
      
      foundRules.push({
        id: ruleId,
        name: ruleName,
        matchIndex: matchIndex,
        // Extract the full rule definition (this is a basic attempt, may need refinement)
        definition: context
      });
    }
    
    log(`\nFound ${foundRules.length} rules using direct pattern extraction`);
    
    if (foundRules.length > 0) {
      log("\nFirst 5 rule names:");
      foundRules.slice(0, 5).forEach((rule, i) => {
        log(`${i+1}. ${rule.name}`);
      });
    }
    
    log("\nNow trying a structured approach to extract rule actions:");
    
    // Extract events and actions from rules
    const enrichedRules = foundRules.map(rule => {
      // Try to extract event type
      let eventType = "Unknown";
      const eventMatch = rule.definition.match(/events:\[.*?path:"([^"]+)"/);
      if (eventMatch && eventMatch[1]) {
        const path = eventMatch[1];
        const pathParts = path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        eventType = fileName.split('.')[0];
      }
      
      // Try to extract actions
      let hasActions = false;
      let hasTrackerProps = false;
      let hasCustomCode = false;
      
      if (rule.definition.includes('actions:[')) {
        hasActions = true;
        hasTrackerProps = rule.definition.includes('trackerProperties:');
        hasCustomCode = rule.definition.includes('customCode.js');
      }
      
      return {
        ...rule,
        eventType,
        hasActions,
        hasTrackerProps,
        hasCustomCode
      };
    });
    
    log("\nEnriched rule details (first 5):");
    enrichedRules.slice(0, 5).forEach((rule, i) => {
      log(`${i+1}. ${rule.name}`);
      log(`   Event type: ${rule.eventType}`);
      log(`   Has actions: ${rule.hasActions}`);
      log(`   Has tracker properties: ${rule.hasTrackerProps}`);
      log(`   Has custom code: ${rule.hasCustomCode}`);
    });
    
    log("\nExporting rules to JSON for further analysis");
    
    // This is the format we need for the Nightjar client
    const nightjarFormat = {
      rules: {
        names: enrichedRules.map(r => r.name),
        events: enrichedRules.map(r => r.eventType),
        conditions: enrichedRules.map(r => ""),  // Would need more complex extraction
        actions: enrichedRules.map(r => r.hasActions ? "Has actions" : ""),
        trackerProperties: enrichedRules.map(r => r.hasTrackerProps ? "Has tracker properties" : ""),
        customCode: enrichedRules.map(r => r.hasCustomCode ? "Has custom code" : "")
      }
    };
    
    log("\nFormat for Nightjar client:");
    log(`${JSON.stringify(nightjarFormat, null, 2).substring(0, 200)}...`);
    
    return {
      foundRules: enrichedRules,
      nightjarFormat
    };
    
  } catch (error) {
    log(`Error during rule extraction: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

// Run the extraction
extractRules().then(result => {
  if (result) {
    log(`\nExtraction completed with ${result.foundRules.length} rules found.`);
  } else {
    log("\nExtraction failed.");
  }
});
