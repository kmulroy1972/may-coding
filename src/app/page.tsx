"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendMessageToAI } from "@/lib/sendMessageToAI";
import "./globals.css";

/* ── Types ─────────────────────────────────────────── */
interface Message {
  text: string;
  sender: "user" | "ai";
  typing?: boolean;               // used for optional typewriter CSS
}

/* ── Component ─────────────────────────────────────── */
export default function HomePage() {
  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* Scroll to latest message */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Send user text to backend */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { text: input, sender: "user" };
    setMessages((ms) => [...ms, userMsg]);
    setIsLoading(true);
    setInput("");

    try {
      /* set typing flag so CSS typewriter animates */
      setMessages((ms) => [...ms, { text: "…", sender: "ai", typing: true }]);

      const aiResponse = await sendMessageToAI(input);

      /* replace placeholder with real response */
      setMessages((ms) => [
        ...ms.slice(0, -1),
        { text: aiResponse, sender: "ai" },
      ]);
    } catch {
      setMessages((ms) => [
        ...ms.slice(0, -1),
        { text: "Error fetching AI response.", sender: "ai" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  /* handle Enter vs Shift‑Enter */
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  /* ── Dark‑mode toggle ───────────────────────────── */
  function toggleTheme() {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "" : "dark";
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="main-bg">
      <header className="main-header">
        <span className="main-title">Mosaic</span>
        <button onClick={toggleTheme} className="theme-btn">
          ☾ / ☀︎
        </button>
      </header>

      <main className="main-flex">
        <section className="chat-panel">
          <h2 className="section-title">AI Assistant</h2>

          <div className="chat-messages-panel">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.sender} ${
                  msg.sender === "ai" && !msg.typing ? "markdown" : ""
                } ${msg.sender === "ai" && idx === messages.length - 1 && msg.typing ? "typewriter" : ""}`}
                style={{wordBreak: 'break-word', overflowWrap: 'anywhere'}}
              >
                <ReactMarkdown
                  components={{ table: ({ node, ...props }) => <table {...props} className="chat-table" /> }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            ))}

            {isLoading && (
              <div className="chat-bubble ai">
                <div className="loader">Thinking...</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSend}>
            <textarea
              className="chat-input"
              placeholder="Type your message. Shift+Enter for newline."
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
        </section>
      </main>
    </div>
  );
}