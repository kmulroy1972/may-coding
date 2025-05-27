import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function GET() {
  try {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Vector store not configured' },
        { status: 500 }
      );
    }

    // Get list of files in the vector store
    const files = await openai.vectorStores.files.list(vectorStoreId);
    
    // Get file details for each file
    const documents = await Promise.all(
      files.data.map(async (file) => {
        try {
          const fileDetails = await openai.files.retrieve(file.id);
          return {
            id: file.id,
            filename: fileDetails.filename,
            status: file.status,
            size: fileDetails.bytes,
            uploadedAt: new Date(fileDetails.created_at * 1000).toISOString(),
            metadata: {
              // You can store metadata in the file purpose or filename
              type: 'unknown',
              source: 'unknown',
              year: 'unknown'
            }
          };
        } catch (error) {
          console.error(`Failed to get details for file ${file.id}:`, error);
          return {
            id: file.id,
            filename: 'Unknown',
            status: file.status,
            size: 0,
            uploadedAt: new Date().toISOString(),
            metadata: {}
          };
        }
      })
    );

    return NextResponse.json({ documents });

  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}