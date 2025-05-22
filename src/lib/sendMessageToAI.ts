function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Get session ID from localStorage or create a new one
function getSessionId() {
  if (typeof window === 'undefined') return 'server-side';
  
  let sessionId = localStorage.getItem('mosaic-session-id');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('mosaic-session-id', sessionId);
  }
  return sessionId;
}

export async function sendMessageToAI(text: string): Promise<string> {
  try {
    console.log('Sending message to AI:', text);
    
    const sessionId = getSessionId();
    
    const response = await fetch('/api/askai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: text,
        sessionId: sessionId
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`Error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.answer) {
      console.warn('No answer in response:', data);
      return 'I had trouble understanding that question. Could you rephrase it?';
    }
    
    // If we received a suggestion, add it to the answer
    if (data.suggestion) {
      return `${data.answer}\n\nTry asking: "${data.suggestion}"`;
    }
    
    return data.answer;
  } catch (error) {
    console.error('AI request failed:', error);
    return 'Sorry, I encountered an error while processing your request. Please try again.';
  }
}

// Add a function to clear the conversation history
export function clearConversation() {
  if (typeof window === 'undefined') return;
  
  const sessionId = getSessionId();
  
  fetch('/api/clearConversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch(err => {
    console.error('Failed to clear conversation:', err);
  });
}