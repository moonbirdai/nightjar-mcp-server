#!/usr/bin/env node

/**
 * Test script for Nightjar Rule Analysis
 * Tests rule parsing and analysis functionality
 */

import { NightjarClient } from './nightjar-client.js';

// Use the specified Adobe Launch URL
const TEST_EMBED_URL = 'https://assets.adobedtm.com/cc968521f43d/17f2e229a9a8/launch-26be2a6b5d5f-development.min.js';

async function main() {
  console.log('Testing Nightjar Rule Analysis');
  
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
    
    parsed.rules.names.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
      console.log(`     Event type: ${parsed.rules.events[index]}`);
      console.log(`     Has conditions: ${parsed.rules.conditions[index] ? 'Yes' : 'No'}`);
      console.log(`     Has tracker properties: ${parsed.rules.trackerProperties[index] ? 'Yes' : 'No'}`);
      console.log(`     Has custom code: ${parsed.rules.customCode[index] ? 'Yes' : 'No'}`);
    });
    
    // Analyze a specific rule if found
    if (ruleCount > 0) {
      const ruleName = parsed.rules.names[0];
      console.log(`\nAnalyzing rule "${ruleName}":`);
      
      const analysis = await nightjar.analyzeRule(ruleName, false); // No AI
      console.log(analysis);
    }
    
    // Show data elements information
    const dataElementCount = Object.keys(parsed.dataElements || {}).length;
    console.log(`\nFound ${dataElementCount} data elements:`);
    if (dataElementCount > 0) {
      console.log(Object.keys(parsed.dataElements).join(', '));
      
      // Analyze a specific data element if found
      const firstDataElement = Object.keys(parsed.dataElements)[0];
      console.log(`\nAnalyzing data element "${firstDataElement}":`);
      
      const analysis = await nightjar.analyzeDataElement(firstDataElement, false); // No AI
      console.log(analysis);
    }
    
    // Show variables information
    const variableCount = Object.keys(parsed.variables || {}).length;
    console.log(`\nFound ${variableCount} variables:`);
    if (variableCount > 0) {
      console.log(Object.keys(parsed.variables).join(', '));
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    console.error(error.stack);
  }
}

main();
