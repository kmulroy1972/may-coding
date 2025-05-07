'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import '../chat/chat.css';
import { sendMessageToAI } from '@/lib/sendMessageToAI';

interface Message {
  text: string;
  sender: 'user' | 'ai';
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage: Message = { text: input, sender: "user" };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setInput("");
    try {
      const aiResponse = await sendMessageToAI(newMessages);
      setMessages([...newMessages, { text: aiResponse, sender: "ai" }]);
    } catch (err) {
      setMessages([...newMessages, { text: "Error fetching AI response.", sender: "ai" }]);
    }
    setIsLoading(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  return (
    <div className="chat-root">
      <div className="chat-container">
        <h2 className="chat-title">AI Assistant</h2>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.sender}`}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          ))}
          {isLoading && (
            <div className="chat-message ai">
              <div className="loader">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input-form" onSubmit={handleSend}>
          <textarea
            className="chat-input"
            placeholder="Type your message. Shift+Enter for newline."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            rows={2}
          />
          <button
            className="chat-send-btn"
            type="submit"
            disabled={isLoading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 