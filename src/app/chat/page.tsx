import { redirect } from 'next/navigation';

export default function HomePage() {
  // Forward the root route to the chat interface
  redirect('/chat');
  return null;
}