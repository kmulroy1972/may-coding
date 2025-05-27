import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function DELETE(
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

    // Remove file from vector store
    await openai.vectorStores.files.del(vectorStoreId, documentId);
    
    // Delete the file from OpenAI
    try {
      await openai.files.del(documentId);
    } catch (error) {
      // File might already be deleted or not accessible
      console.warn(`Could not delete file ${documentId}:`, error);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}