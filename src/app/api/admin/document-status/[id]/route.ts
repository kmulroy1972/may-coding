import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    const resolvedParams = await params;
    const documentId = resolvedParams.id;
    
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Vector store not configured' },
        { status: 500 }
      );
    }

    // Get file status from vector store
    const vectorStoreFile = await openai.vectorStores.files.retrieve(
      vectorStoreId,
      documentId
    );

    return NextResponse.json({
      status: vectorStoreFile.status,
      lastError: vectorStoreFile.last_error
    });

  } catch (error) {
    console.error('Failed to get document status:', error);
    return NextResponse.json(
      { error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}