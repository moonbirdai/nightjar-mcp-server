#!/usr/bin/env node

/**
 * Test script for Nightjar MCP Server rule parsing
 * This script focuses specifically on rule parsing functionality
 */

import { NightjarClient } from './nightjar-client.js';

// Sample Adobe Launch embed code URL
// This is a public embed code used by example sites
const TEST_EMBED_URL = 'https://assets.adobedtm.com/launch-EN93497c30fdf0424098b222b5ec816b00.min.js';

// Initialize client with debug mode enabled
const nightjar = new NightjarClient();
nightjar.setDebug(true);

console.log('Testing Nightjar rule parsing functionality...');

async function testRuleParsing() {
  try {
    // Parse the embed code
    console.log(`\nParsing embed code: ${TEST_EMBED_URL}`);
    const parsedData = await nightjar.parseEmbed(TEST_EMBED_URL);
    
    // Log the rules structure to examine what's being parsed
    console.log('\n=== Rules Structure ===');
    console.log('Rule names:', parsedData.rules.names);
    console.log('Rule events:', parsedData.rules.events);
    console.log('Rule conditions:', parsedData.rules.conditions);
    console.log('Rule actions:', parsedData.rules.actions);
    console.log('Rule tracker properties:', parsedData.rules.trackerProperties);
    console.log('Rule custom code:', parsedData.rules.customCode);
    
    // Test getting a specific rule
    if (parsedData.rules.names.length > 0) {
      const ruleName = parsedData.rules.names[0];
      console.log(`\n=== Analyzing rule "${ruleName}" ===`);
      
      // Test rule analysis functionality
      const ruleAnalysis = await nightjar.analyzeRule(ruleName, false);
      console.log('Rule analysis result:', ruleAnalysis);
    } else {
      console.log('No rules found to analyze');
    }
    
    console.log('\nRule parsing tests completed.');
  } catch (error) {
    console.error('Rule parsing test failed:', error);
  }
}

testRuleParsing();
