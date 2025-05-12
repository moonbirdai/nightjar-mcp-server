#!/usr/bin/env node

/**
 * Test script for Nightjar MCP Server
 * Tests basic functionality and parsing of Adobe Launch embed codes
 */

import { NightjarClient } from './nightjar-client.js';

// Sample Adobe Launch embed code URL
// This is a public embed code used by example sites
const TEST_EMBED_URL = 'https://assets.adobedtm.com/launch-EN93497c30fdf0424098b222b5ec816b00.min.js';

// Sample website that uses Adobe Launch
const TEST_WEBSITE_URL = 'https://www.adobe.com';

// Initialize client
const nightjar = new NightjarClient();
nightjar.setDebug(true);

console.log('Testing Nightjar MCP Server client implementation...');

async function runTests() {
  try {
    // Test direct embed code parsing
    console.log('\n1. Testing direct embed code parsing...');
    console.log(`Parsing embed code: ${TEST_EMBED_URL}`);
    
    try {
      const parsedData = await nightjar.parseEmbed(TEST_EMBED_URL);
      console.log('✅ Successfully parsed embed code');
      console.log(`Found ${Object.keys(parsedData.dataElements || {}).length} data elements`);
      console.log(`Found ${parsedData.rules.names.length} rules`);
      console.log(`Found ${Object.keys(parsedData.variables || {}).length} variables`);
    } catch (error) {
      console.error('❌ Failed to parse embed code:', error.message);
    }

    // Test extracting embed code from URL
    console.log('\n2. Testing embed code extraction from URL...');
    console.log(`Extracting from: ${TEST_WEBSITE_URL}`);
    
    try {
      const embedCode = await nightjar.extractEmbedFromUrl(TEST_WEBSITE_URL);
      console.log('✅ Successfully extracted embed code');
      console.log(`Embed code: ${embedCode}`);
    } catch (error) {
      console.error('❌ Failed to extract embed code:', error.message);
    }

    console.log('\nTests completed.');
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

runTests();
