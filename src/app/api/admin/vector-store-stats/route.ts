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

    // Get vector store files
    const files = await openai.vectorStores.files.list(vectorStoreId);
    
    // Calculate statistics
    const stats = {
      totalFiles: files.data.length,
      completedFiles: files.data.filter(f => f.status === 'completed').length,
      processingFiles: files.data.filter(f => f.status === 'in_progress').length,
      failedFiles: files.data.filter(f => f.status === 'failed').length
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Failed to fetch vector store stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}