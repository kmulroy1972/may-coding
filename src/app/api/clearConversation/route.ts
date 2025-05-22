import { NextRequest, NextResponse } from 'next/server';
import { clearConversation } from '@/lib/conversationMemory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || 'default-session';
    
    clearConversation(sessionId);
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error clearing conversation:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}