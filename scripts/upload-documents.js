#!/usr/bin/env node

/**
 * Document Upload Script for Mosaic Vector Store
 * 
 * This script uploads earmark-related documents to the vector store
 * for semantic search capabilities.
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

/**
 * Upload a file from URL or local path
 */
async function uploadFile(filePath, metadata = {}) {
  console.log(`📤 Uploading: ${filePath}`);
  
  try {
    let result;
    
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      // Download and upload from URL
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to download ${filePath}: ${response.statusText}`);
      }
      
      const buffer = await response.arrayBuffer();
      const urlParts = filePath.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const file = new File([buffer], fileName);
      
      result = await openai.files.create({
        file: file,
        purpose: "assistants"
      });
    } else {
      // Upload local file
      if (!fs.existsSync(filePath)) {
        throw new Error(`Local file not found: ${filePath}`);
      }
      
      const fileContent = fs.createReadStream(filePath);
      result = await openai.files.create({
        file: fileContent,
        purpose: "assistants"
      });
    }
    
    console.log(`✅ File uploaded: ${result.id} (${result.filename})`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to upload ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Add file to vector store
 */
async function addFileToVectorStore(vectorStoreId, fileId) {
  try {
    const result = await openai.vectorStores.files.create(vectorStoreId, {
      file_id: fileId
    });
    
    console.log(`📁 Added to vector store: ${fileId}`);
    return result;
    
  } catch (error) {
    console.error(`❌ Failed to add file ${fileId} to vector store:`, error.message);
    throw error;
  }
}

/**
 * Check processing status of files in vector store
 */
async function checkVectorStoreStatus(vectorStoreId) {
  try {
    const files = await openai.vectorStores.files.list(vectorStoreId);
    
    console.log('\n📊 Vector Store File Status:');
    console.log('==============================');
    
    for (const file of files.data) {
      const statusIcon = file.status === 'completed' ? '✅' : 
                        file.status === 'failed' ? '❌' : '⏳';
      console.log(`${statusIcon} ${file.id}: ${file.status}`);
    }
    
    const completed = files.data.filter(f => f.status === 'completed').length;
    const total = files.data.length;
    
    console.log(`\n📈 Progress: ${completed}/${total} files ready`);
    
    if (completed < total) {
      console.log('⏳ Some files are still processing. Run this script again to check status.');
    } else {
      console.log('🎉 All files are ready for search!');
    }
    
    return files.data;
    
  } catch (error) {
    console.error('❌ Failed to check vector store status:', error.message);
    throw error;
  }
}

/**
 * Sample earmark-related documents to upload
 */
const SAMPLE_DOCUMENTS = [
  {
    url: "https://docs.house.gov/meetings/AP/AP00/20240312/116937/HHRG-118-AP00-20240312-SD001.pdf",
    description: "House Appropriations Committee Community Project Funding Guidelines",
    metadata: { type: "guidelines", source: "house", year: "2024" }
  },
  {
    url: path.join(__dirname, '..', 'docs', 'earmark-data-dictionary.md'),
    description: "Federal Earmark Database Data Dictionary and Schema Guide",
    metadata: { type: "schema", source: "internal", category: "reference" }
  },
  // Add more documents as needed
  // You can add local files by providing file paths instead of URLs
];

async function main() {
  console.log('📋 Mosaic Document Upload');
  console.log('=========================\n');
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  // Load vector store config
  const configPath = path.join(__dirname, '..', 'vector-store-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ Vector store config not found. Run setup-vector-store.js first.');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const vectorStoreId = config.vectorStoreId;
  
  console.log(`🎯 Using vector store: ${vectorStoreId}`);
  console.log(`📛 Name: ${config.name}\n`);
  
  // Check if we should just check status
  if (process.argv.includes('--status')) {
    await checkVectorStoreStatus(vectorStoreId);
    return;
  }
  
  try {
    // Upload and add sample documents
    console.log('📤 Uploading sample documents...\n');
    
    for (const doc of SAMPLE_DOCUMENTS) {
      try {
        console.log(`📖 Processing: ${doc.description}`);
        const file = await uploadFile(doc.url, doc.metadata);
        await addFileToVectorStore(vectorStoreId, file.id);
        console.log(''); // Empty line for readability
      } catch (error) {
        console.error(`⚠️  Skipping document due to error: ${error.message}\n`);
      }
    }
    
    // Check final status
    console.log('🔍 Checking processing status...\n');
    await checkVectorStoreStatus(vectorStoreId);
    
    console.log('\n💡 To add more documents:');
    console.log('1. Add URLs or file paths to SAMPLE_DOCUMENTS in this script');
    console.log('2. Run: npm run upload-docs');
    console.log('3. Check status with: npm run upload-docs -- --status');
    
  } catch (error) {
    console.error('\n💥 Upload failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}