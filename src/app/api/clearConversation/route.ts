import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory conversation store (matches your current conversationMemory.ts)
// This will be enhanced when you upgrade to the full conversation memory system
const conversations: Record<string, any> = {};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || 'default-session';
    
    console.log(`🧹 Clearing conversation for session: ${sessionId}`);
    
    // Clear the conversation data
    if (conversations[sessionId]) {
      delete conversations[sessionId];
    }
    
    // You can also call your existing clearConversation function if available
    try {
      // Try to import and use existing function (graceful fallback)
      const { clearConversation } = await import('@/lib/conversationMemory');
      clearConversation(sessionId);
    } catch (importError) {
      // If the enhanced function doesn't exist yet, just clear our local store
      console.log('Using basic conversation clearing (enhanced memory not available yet)');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Conversation cleared successfully',
      sessionId 
    });
    
  } catch (error) {
    console.error('❌ Error clearing conversation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to clear conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({ 
    status: 'Clear conversation endpoint is working',
    timestamp: new Date().toISOString()
  });
}