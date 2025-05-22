export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  messages: Message[];
  lastUpdated: number;
}

// Maximum number of messages to keep in memory
const MAX_MESSAGES = 10;

// In-memory store (in a real app, you might use localStorage or a database)
let conversations: Record<string, Conversation> = {};

/**
 * Adds a message to the conversation history
 */
export function addMessage(
  sessionId: string, 
  role: 'user' | 'assistant', 
  content: string
): void {
  // Get or create conversation
  if (!conversations[sessionId]) {
    conversations[sessionId] = {
      messages: [],
      lastUpdated: Date.now()
    };
  }
  
  // Add the new message
  conversations[sessionId].messages.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  // Update the last updated timestamp
  conversations[sessionId].lastUpdated = Date.now();
  
  // Trim conversation if needed
  if (conversations[sessionId].messages.length > MAX_MESSAGES) {
    // Keep the most recent messages
    conversations[sessionId].messages = conversations[sessionId].messages.slice(-MAX_MESSAGES);
  }
}

/**
 * Gets the conversation history for a session
 */
export function getConversation(sessionId: string): Conversation {
  return (
    conversations[sessionId] || 
    { messages: [], lastUpdated: Date.now() }
  );
}

/**
 * Clears the conversation history for a session
 */
export function clearConversation(sessionId: string): void {
  conversations[sessionId] = {
    messages: [],
    lastUpdated: Date.now()
  };
}

/**
 * Formats the recent conversation history for use in prompts
 */
export function getConversationContext(sessionId: string, maxMessages = 5): string {
  const conversation = getConversation(sessionId);
  
  // Get the most recent messages (up to maxMessages)
  const recentMessages = conversation.messages
    .slice(-maxMessages)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
  
  return recentMessages.length > 0 
    ? `RECENT CONVERSATION HISTORY:\n${recentMessages}\n\n`
    : '';
}