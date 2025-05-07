"use client";
import React, { useState, useRef, useEffect } from "react";
import ResultsList from "@/components/ResultsList";
import ReactMarkdown from "react-markdown";
import { sendMessageToAI } from "@/lib/sendMessageToAI";
import "./globals.css";

interface Message {
  text: string;
  sender: "user" | "ai";
}

export default function HomePage() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage: Message = { text: input, sender: "user" };
    setMessages((ms) => [...ms, userMessage]);
    setIsLoading(true);
    setInput("");
    try {
      const aiResponse = await sendMessageToAI(input);
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

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  // Search state
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{ year: string; member: string }>({ year: "", member: "" });
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    const res = await fetch("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, filters })
    });
    const data = await res.json();
    setResults(data.data || []);
  };

  const handleClearAll = () => {
    setFilters({ year: "", member: "" });
    setQuery("");
    setResults([]);
    setMessages([]);
    setInput("");
  };

  return (
    <div className="main-bg">
      <header className="main-header">
        <span className="main-title">Mosaic</span>
      </header>
      <main className="main-flex">
        {/* Chat Section */}
        <section className="chat-panel">
          <h2 className="section-title">AI Assistant</h2>
          <div className="chat-messages-panel">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${msg.sender}`}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
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
        </section>
        {/* Search & Results Section */}
        <section className="search-panel">
          <h2 className="section-title">Earmark Search</h2>
          <div className="search-card search-card-contrast">
            <input
              id="search-query"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search earmarks..."
              className="input-wide"
            />
            <div className="filter-row">
              <input
                value={filters.year}
                onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
                placeholder="Year"
                className="input-short"
              />
              <input
                value={filters.member}
                onChange={e => setFilters(f => ({ ...f, member: e.target.value }))}
                placeholder="Member"
                className="input-medium"
              />
              <button onClick={handleSearch} className="primary-btn">Search</button>
              <button onClick={handleClearAll} className="secondary-btn">Clear</button>
            </div>
          </div>
          <div className="results-section">
            <ResultsList results={results} />
          </div>
        </section>
      </main>
    </div>
  );
}