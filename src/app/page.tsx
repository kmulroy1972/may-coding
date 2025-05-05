"use client";
import React, { useState } from "react";
import ResultsList from "@/components/ResultsList";
import { Earmark } from "@/types/database.types";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{ year: string; member: string }>({ year: "", member: "" });
  const [results, setResults] = useState<Earmark[]>([]);
  
  // Conversational state
  const [messages, setMessages] = useState<{ role: "user"|"assistant", content: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Search
  const handleSearch = async () => {
    const res = await fetch("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, filters })
    });
    const data = await res.json();
    setResults(data.data || []);
  };

  // Conversational AI Ask
  const handleSend = async () => {
    if (!currentMessage.trim()) return;
    const newMessages = [...messages, { role: "user", content: currentMessage }];
    setMessages(newMessages);
    setCurrentMessage("");
    setAiLoading(true);

    const res = await fetch("/api/askai", {
      method: "POST",
      body: JSON.stringify({ messages: newMessages })
    });
    const data = await res.json();
    setMessages([...newMessages, { role: "assistant", content: data.answer }]);
    setAiLoading(false);
  };

  // Clear all
  const handleClearAll = () => {
    setFilters({ year: "", member: "" });
    setQuery("");
    setResults([]);
    setMessages([]);
    setCurrentMessage("");
  };

  return (
    <div className="app-bg">
      <header className="app-header">
        <span className="app-title">Mosaic</span>
      </header>
      <main className="main-content">
        <div className="search-card">
          {/* Conversational Chat Section */}
          <section className="search-section">
            <label className="section-label">Ask a question</label>
            <div className="chat-box" style={{border:"1px solid #ddd", maxHeight: 200, overflowY: "auto", marginBottom: 8, padding: 8}}>
              {messages.map((msg, i) =>
                <div key={i} style={{marginBottom: 6, color: msg.role === "assistant" ? "#314ed4" : "#222"}}>
                  <b>{msg.role === "user" ? "You" : "AI"}</b>: {msg.content}
                </div>
              )}
              {aiLoading && <div><b>AI:</b> Thinking...</div>}
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSend(); }}>
              <input
                value={currentMessage}
                onChange={e => setCurrentMessage(e.target.value)}
                placeholder="Type your question..."
                className="input-wide"
                disabled={aiLoading}
              />
              <button type="submit" disabled={aiLoading || !currentMessage.trim()} className="primary-btn">
                Send
              </button>
            </form>
          </section>

          {/* Earmark Search Section */}
          <section className="search-section">
            <label htmlFor="search-query" className="section-label">Search earmarks</label>
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
          </section>
        </div>
        <div className="results-section">
          <ResultsList results={results} />
        </div>
      </main>
    </div>
  );
}