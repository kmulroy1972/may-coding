// Example: frontend/src/api/ai.js
export async function sendMessageToAI(text) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });
  if (!response.ok) throw new Error
