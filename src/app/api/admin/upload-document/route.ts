import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
    
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Vector store not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadataString = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    let metadata = {};
    try {
      metadata = JSON.parse(metadataString);
    } catch {
      // Use empty metadata if parsing fails
    }

    // Check file size (OpenAI has limits)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, Word, Text, or Markdown files.' },
        { status: 400 }
      );
    }

    // Upload file to OpenAI
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants'
    });

    // Add file to vector store
    await openai.vectorStores.files.create(vectorStoreId, {
      file_id: uploadedFile.id
    });

    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      filename: uploadedFile.filename,
      size: uploadedFile.bytes,
      metadata
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('file_too_large')) {
        return NextResponse.json(
          { error: 'File too large' },
          { status: 400 }
        );
      }
      if (error.message.includes('invalid_file_format')) {
        return NextResponse.json(
          { error: 'Invalid file format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}