#!/usr/bin/env node

/**
 * Simple test script for Nightjar after fixing rule parsing
 */

import { NightjarClient } from './nightjar-client.js';

// Use the specified Adobe Launch URL
const TEST_EMBED_URL = 'https://assets.adobedtm.com/cc968521f43d/17f2e229a9a8/launch-26be2a6b5d5f-development.min.js';

async function main() {
  console.log('Testing Nightjar with the Adobe Launch URL...');
  
  // Create client with debug mode
  const nightjar = new NightjarClient();
  nightjar.setDebug(true);
  
  try {
    // Parse the specified embed code
    console.log(`\nParsing embed code: ${TEST_EMBED_URL}`);
    const parsed = await nightjar.parseEmbed(TEST_EMBED_URL);
    
    // Show rule information
    const ruleCount = parsed.rules.names.length;
    console.log(`\nFound ${ruleCount} rules:`);
    
    if (ruleCount > 0) {
      parsed.rules.names.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
        console.log(`     Event type: ${parsed.rules.events[index]}`);
        console.log(`     Has conditions: ${parsed.rules.conditions[index] ? 'Yes' : 'No'}`);
        console.log(`     Has tracker properties: ${parsed.rules.trackerProperties[index] ? 'Yes' : 'No'}`);
        console.log(`     Has custom code: ${parsed.rules.customCode[index] ? 'Yes' : 'No'}`);
      });
      
      // Analyze first rule
      const ruleName = parsed.rules.names[0];
      console.log(`\nAnalyzing rule "${ruleName}":`);
      const analysis = await nightjar.analyzeRule(ruleName, false); // No AI
      console.log(analysis);
      
      console.log("\nSUCCESS: Rule parsing is now working correctly!");
    } else {
      console.log("WARNING: No rules were found.");
    }
    
    // Show data elements information
    const dataElementCount = Object.keys(parsed.dataElements || {}).length;
    console.log(`\nFound ${dataElementCount} data elements:`);
    
    if (dataElementCount > 0) {
      console.log(`Data elements: ${Object.keys(parsed.dataElements).slice(0, 5).join(', ')}${Object.keys(parsed.dataElements).length > 5 ? '...' : ''}`);
    }
    
    // Show variables information
    const variableCount = Object.keys(parsed.variables || {}).length;
    console.log(`\nFound ${variableCount} variables:`);
    
    if (variableCount > 0) {
      console.log(`Variables: ${Object.keys(parsed.variables).slice(0, 5).join(', ')}${Object.keys(parsed.variables).length > 5 ? '...' : ''}`);
    }
    
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    console.error(error.stack);
  }
}

main();
