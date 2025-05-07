export async function sendMessageToAI(text: string): Promise<string> {
  const response = await fetch('/api/askai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: text }),
  });
  if (!response.ok) throw new Error('Failed to fetch AI response');
  const data = await response.json();
  return data.answer || 'No response from AI.';
} 