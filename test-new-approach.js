#!/usr/bin/env node

/**
 * Test the new rule extraction approach
 */

// Run extract-rules.js first to verify the approach
console.log("Step 1: Running extract-rules.js to test direct pattern matching...");

import { exec } from 'child_process';
import { NightjarClient } from './nightjar-client.js';

// Test the extract-rules.js approach first
exec('node extract-rules.js', async (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  
  console.log(stdout);
  
  // Now test the updated nightjar-client.js
  console.log("\n\nStep 2: Testing the updated NightjarClient...");
  
  // Use the specified Adobe Launch URL
  const TEST_EMBED_URL = 'https://assets.adobedtm.com/cc968521f43d/17f2e229a9a8/launch-26be2a6b5d5f-development.min.js';
  
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
      // Show first 5 rules
      const showCount = Math.min(5, ruleCount);
      parsed.rules.names.slice(0, showCount).forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
        console.log(`     Event type: ${parsed.rules.events[index]}`);
        console.log(`     Has conditions: ${parsed.rules.conditions[index] ? 'Yes' : 'No'}`);
        console.log(`     Has tracker properties: ${parsed.rules.trackerProperties[index] ? 'Yes' : 'No'}`);
        console.log(`     Has custom code: ${parsed.rules.customCode[index] ? 'Yes' : 'No'}`);
      });
      
      console.log(`  ... and ${ruleCount - showCount} more rules`);
      
      // Try analyzing first rule
      if (ruleCount > 0) {
        const ruleName = parsed.rules.names[0];
        console.log(`\nAnalyzing rule "${ruleName}":`);
        
        const analysis = await nightjar.analyzeRule(ruleName, false); // No AI
        console.log(analysis);
      }
      
      console.log("\nSUCCESS: Rule parsing is now working correctly!");
    } else {
      console.log("WARNING: No rules were found.");
    }
    
    // Show data elements information
    const dataElementCount = Object.keys(parsed.dataElements || {}).length;
    console.log(`\nFound ${dataElementCount} data elements:`);
    
    if (dataElementCount > 0) {
      console.log(`First 5 data elements: ${Object.keys(parsed.dataElements).slice(0, 5).join(', ')}${Object.keys(parsed.dataElements).length > 5 ? '...' : ''}`);
    }
    
    // Show variables information
    const variableCount = Object.keys(parsed.variables || {}).length;
    console.log(`\nFound ${variableCount} variables:`);
    
    if (variableCount > 0) {
      console.log(`First 5 variables: ${Object.keys(parsed.variables).slice(0, 5).join(', ')}${Object.keys(parsed.variables).length > 5 ? '...' : ''}`);
    }
    
  } catch (error) {
    console.error('\nTest failed with error:', error.message);
    console.error(error.stack);
  }
});
