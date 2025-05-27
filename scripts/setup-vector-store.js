#!/usr/bin/env node

/**
 * Vector Store Setup Script for Mosaic Earmark Analysis
 * 
 * This script creates a vector store and uploads earmark-related documents
 * for use with OpenAI's File Search tool.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function createVectorStore() {
  try {
    console.log('🚀 Creating vector store for Mosaic earmark documents...');

    // Create the vector store
    const vectorStore = await openai.vectorStores.create({
      name: "mosaic-earmark-knowledge-base",
      metadata: {
        purpose: "Federal earmark analysis and policy documentation",
        created_by: "mosaic-app",
        version: "1.0"
      }
    });

    console.log(`✅ Vector store created successfully!`);
    console.log(`📋 Vector Store ID: ${vectorStore.id}`);
    console.log(`📛 Name: ${vectorStore.name}`);
    
    // Save the vector store ID to a config file for your app to use
    const configPath = path.join(__dirname, '..', 'vector-store-config.json');
    const config = {
      vectorStoreId: vectorStore.id,
      name: vectorStore.name,
      createdAt: new Date().toISOString(),
      purpose: "Earmark policy and procedural documentation"
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`💾 Config saved to: ${configPath}`);
    
    // Display next steps
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Add documents to your vector store using:');
    console.log('   npm run upload-docs');
    console.log('2. Add this to your .env.local file:');
    console.log(`   OPENAI_VECTOR_STORE_ID=${vectorStore.id}`);
    console.log('3. Update your API route to use file search');
    
    return vectorStore;

  } catch (error) {
    console.error('❌ Error creating vector store:', error);
    
    if (error.code === 'invalid_api_key') {
      console.error('\n💡 Make sure your OPENAI_API_KEY is set in your environment variables');
      console.error('   You can add it to your .env.local file');
    }
    
    throw error;
  }
}

async function main() {
  console.log('🔧 Mosaic Vector Store Setup');
  console.log('============================\n');
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.error('💡 Add it to your .env.local file or export it in your shell');
    process.exit(1);
  }
  
  try {
    await createVectorStore();
    console.log('\n🎉 Vector store setup complete!');
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createVectorStore };