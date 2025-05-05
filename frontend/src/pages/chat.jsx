import ReactMarkdown from 'react-markdown';
import React, { useState, useRef, useEffect } from "react";
import "./Chat.css"; // We'll create a dedicated chat style file
import { sendMessageToAI } from "../api/ai"; // This should call your backend

export default function Chat() {
  const [messages, setMessages] = useState([
    // You can preload some test messages if desired
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Always scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage = { text: input, sender: "user" };

    setMessages((ms) => [...ms, userMessage]);
    setIsLoading(true);
    setInput("");

    try {
      const aiResponse = await sendMessageToAI(input); // Should return a string AI reply
      setMessages((ms) => [
        ...ms,
        { text: aiResponse, sender: "ai" },
      ]);
    } catch (err) {
      setMessages((ms) => [
        ...ms,
        { text: "Error fetching AI response.", sender: "ai" },
      ]);
    }
    setIsLoading(false);
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSend(e);
    }
  }

  // For markdown rendering, you can install 'react-markdown':
  // npm install react-markdown
  // Uncomment below lines if used
  // import ReactMarkdown from 'react-markdown';

  return (
    <div className="chat-root">
      <div className="chat-container">
        <h2 className="chat-title">AI Assistant</h2>
        <div className="chat-messages">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.sender === "user" ? "user" : "ai"}`}
            >
              {/* For markdown: use <ReactMarkdown>{msg.text}</ReactMarkdown> */}
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
