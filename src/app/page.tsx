"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { sendMessageToAI, clearConversation } from "@/lib/sendMessageToAI";
import "./globals.css";

/* ── Types ─────────────────────────────────────────── */
type Message = {
  text: string;
  sender: 'user' | 'ai';
  typing?: boolean;               // used for optional typewriter CSS
  id?: number;                    // unique ID for the message
};

type ParsedQuery = {
  year?: number;
  agency?: string;
  location?: string;
  member?: string;
  minAmount?: number;
  maxAmount?: number;
};

/* ── Component ─────────────────────────────────────── */
export default function HomePage() {
  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'up' | 'down' | null>>({});
  const [showQueryBuilder, setShowQueryBuilder] = useState(true);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  /* Predefined options for query builder */
  const agencies = [
    { value: "Labor", label: "Department of Labor" },
    { value: "Transportation", label: "Department of Transportation" },
    { value: "Health and Human Services", label: "Department of Health and Human Services" },
    { value: "Housing and Urban Development", label: "Department of Housing and Urban Development" },
    { value: "Education", label: "Department of Education" },
    { value: "Defense", label: "Department of Defense" }
  ];

  const years = [
    { value: 2022, label: "2022" },
    { value: 2023, label: "2023" },
    { value: 2024, label: "2024" }
  ];

  const states = [
    { value: "CA", label: "California" },
    { value: "TX", label: "Texas" },
    { value: "NY", label: "New York" },
    { value: "FL", label: "Florida" },
    { value: "PA", label: "Pennsylvania" },
    { value: "NJ", label: "New Jersey" }
    // Add more as needed
  ];
  
  /* Sample queries to display */
  const sampleQueries = [
    "Show me earmarks from the Department of Education in 2022",
    "What are the largest earmarks over $1 million?",
    "Which agencies received the most funding in 2023?",
    "Show me earmarks for healthcare projects",
    "Who requested the most earmarks in California?"
  ];

  /* Scroll to latest message */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Send user text to backend */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { 
      text: input, 
      sender: "user", 
      id: Date.now() 
    };
    setMessages((ms) => [...ms, userMsg]);
    setIsLoading(true);
    setInput("");
    
    // Hide query builder once user starts chatting
    setShowQueryBuilder(false);

    try {
      /* set typing flag so CSS typewriter animates */
      setMessages((ms) => [...ms, { 
        text: "…", 
        sender: "ai", 
        typing: true, 
        id: Date.now() 
      }]);

      const aiResponse = await sendMessageToAI(input);

      /* replace placeholder with real response */
      setMessages((ms) => [
        ...ms.slice(0, -1),
        { text: aiResponse, sender: "ai", id: Date.now() },
      ]);
      
      // Try to extract and parse query understanding from response
      try {
        const filterMatch = aiResponse.match(/Filters applied: ([^]*?)(?:Number|$)/);
        if (filterMatch && filterMatch[1]) {
          const filters: ParsedQuery = {};
          const filterText = filterMatch[1].trim();
          
          // Extract year
          const yearMatch = filterText.match(/Year: (\d{4})/);
          if (yearMatch) filters.year = parseInt(yearMatch[1]);
          
          // Extract agency
          const agencyMatch = filterText.match(/Agency: Department of ([^,]+)/);
          if (agencyMatch) filters.agency = agencyMatch[1].trim();
          
          // Extract location
          const locationMatch = filterText.match(/Location: ([^,]+)/);
          if (locationMatch) filters.location = locationMatch[1].trim();
          
          // Extract member
          const memberMatch = filterText.match(/Member: ([^,]+)/);
          if (memberMatch) filters.member = memberMatch[1].trim();
          
          // Extract amount filters
          const minAmountMatch = filterText.match(/Minimum Amount: \$([0-9,]+)/);
          if (minAmountMatch) filters.minAmount = parseInt(minAmountMatch[1].replace(/,/g, ''));
          
          const maxAmountMatch = filterText.match(/Maximum Amount: \$([0-9,]+)/);
          if (maxAmountMatch) filters.maxAmount = parseInt(maxAmountMatch[1].replace(/,/g, ''));
          
          // Set parsed query if we found any filters
          if (Object.keys(filters).length > 0) {
            setParsedQuery(filters);
          }
        } else {
          setParsedQuery(null);
        }
      } catch (error) {
        console.error("Error parsing filter data:", error);
        setParsedQuery(null);
      }
    } catch {
      setMessages((ms) => [
        ...ms.slice(0, -1),
        { text: "Error fetching AI response.", sender: "ai", id: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }
  
  /* Handle clicking on a sample query */
  function handleSampleQuery(query: string) {
    setInput(query);
    // Auto-submit the query
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 100);
  }

  /* Build and send query from guided query builder */
  function buildAndSendQuery(year?: number | null, agency?: string | null, state?: string | null) {
    if (!year && !agency && !state) {
      return; // Don't send empty queries
    }
    
    let queryText = "Show me earmarks";
    
    if (agency) {
      queryText += ` from the Department of ${agency}`;
    }
    
    if (year) {
      queryText += ` in ${year}`;
    }
    
    if (state) {
      const stateName = states.find(s => s.value === state)?.label || state;
      queryText += ` in ${stateName}`;
    }
    
    setInput(queryText);
    
    // Auto-submit after a brief delay to let the user see what's being sent
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 500);
  }

  /* Handle feedback for responses */
  function handleFeedback(messageId: number, type: 'up' | 'down') {
    setFeedbackGiven(prev => ({
      ...prev,
      [messageId]: type
    }));
    
    // You could send this feedback to your backend
    console.log(`Message ${messageId} received ${type} feedback`);
  }

  /* handle Enter vs Shift‑Enter */
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  /* Clear all messages and reset conversation */
  function handleClearChat() {
    setMessages([]);
    clearConversation(); // Clear conversation memory
    setFeedbackGiven({});
    setShowQueryBuilder(true);
    setParsedQuery(null);
  }

  /* ── Dark‑mode toggle ───────────────────────────── */
  function toggleTheme() {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "" : "dark";
  }

  /* Format earmark data for better display */
  function formatEarmarkText(text: string) {
    // Check if this is earmark data by looking for common patterns
    if (!text.includes('records found') && !text.includes('SAMPLE RECORDS:')) {
      return <p>{text}</p>;
    }
    
    // Enhance dollar amounts with formatting
    const formattedText = text.replace(/\$[\d,.]+ (?:m(?:illion)?)?/g, (match) => {
      const isLarge = match.includes('million') || 
                     parseInt(match.replace(/[$,]/g, '')) >= 1000000;
      
      return `<span class="dollar-amount ${isLarge ? 'large-amount' : ''}">${match}</span>`;
    });
    
    // Split into sections
    const sections = formattedText.split('\n\n');
    
    return (
      <div className="earmark-results">
        {sections.map((section, i) => {
          // Format the sample records section
          if (section.includes("SAMPLE RECORDS:")) {
            return (
              <div key={i} className="earmark-cards">
                <h3 className="section-subtitle">Sample Records</h3>
                {section.replace("SAMPLE RECORDS:", "").trim().split('\n').map((record, j) => (
                  <div key={j} className="earmark-card" 
                       dangerouslySetInnerHTML={{ __html: record.trim() }} />
                ))}
              </div>
            );
          } 
          // Format the statistics section
          else if (section.includes("STATISTICS:")) {
            return (
              <div key={i} className="statistics-panel">
                <h3 className="section-subtitle">Statistics</h3>
                <ul className="statistics-list">
                  {section.replace("STATISTICS:", "").trim().split('\n').map((stat, j) => (
                    <li key={j} className="statistic-item"
                        dangerouslySetInnerHTML={{ __html: stat.trim().replace('-', '') }} />
                  ))}
                </ul>
              </div>
            );
          }
          // General informational text (not earmark records)
          else if (section.includes("records found") || section.includes("DATABASE CONTEXT:")) {
            return <div key={i} className="info-text" dangerouslySetInnerHTML={{ __html: section }} />;
          }
          // Default formatting for other sections
          return <p key={i} dangerouslySetInnerHTML={{ __html: section }} />;
        })}
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="main-bg">
      <header className="main-header">
        <span className="main-title">Mosaic</span>
        <div className="header-controls">
          <button onClick={handleClearChat} className="clear-btn" disabled={messages.length === 0}>
            New Chat
          </button>
          <button onClick={toggleTheme} className="theme-btn">
            ☾ / ☀︎
          </button>
        </div>
      </header>

      <main className="main-flex">
        <section className="chat-panel">
          <h2 className="section-title">AI Earmark Assistant</h2>
          
          {/* Query Understanding Display */}
          {parsedQuery && Object.keys(parsedQuery).length > 0 && (
            <div className="query-understanding">
              <h4>Query understood as:</h4>
              <ul className="parsed-filters">
                {parsedQuery.year && <li>Year: {parsedQuery.year}</li>}
                {parsedQuery.agency && <li>Agency: Department of {parsedQuery.agency}</li>}
                {parsedQuery.location && <li>Location: {parsedQuery.location}</li>}
                {parsedQuery.member && <li>Member: {parsedQuery.member}</li>}
                {parsedQuery.minAmount && <li>Minimum: ${parsedQuery.minAmount.toLocaleString()}</li>}
                {parsedQuery.maxAmount && <li>Maximum: ${parsedQuery.maxAmount.toLocaleString()}</li>}
              </ul>
            </div>
          )}

          <div className="chat-messages-panel">
            {messages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-icon">🔍</div>
                <h3>Welcome to Mosaic</h3>
                <p>Ask questions about federal earmarks and funding data or use the guided query builder below.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`chat-bubble ${msg.sender} ${
                    msg.sender === "ai" && !msg.typing ? "markdown" : ""
                  } ${msg.sender === "ai" && idx === messages.length - 1 && msg.typing ? "typewriter" : ""}`}
                >
                  <div className={`${msg.sender}-icon`}>
                    {msg.sender === 'user' ? '👤' : '🤖'}
                  </div>
                  <div className="message-content">
                    {msg.sender === "ai" && !msg.typing ? (
                      <>
                        {formatEarmarkText(msg.text)}
                        {msg.id && (
                          <div className="feedback-buttons">
                            {!feedbackGiven[msg.id] ? (
                              <>
                                <button 
                                  onClick={() => handleFeedback(msg.id!, 'up')}
                                  className="feedback-btn"
                                  aria-label="Helpful"
                                >
                                  👍
                                </button>
                                <button 
                                  onClick={() => handleFeedback(msg.id!, 'down')}
                                  className="feedback-btn"
                                  aria-label="Not helpful"
                                >
                                  👎
                                </button>
                              </>
                            ) : (
                              <div className="feedback-thanks">
                                {feedbackGiven[msg.id] === 'up' ? 'Thanks for the feedback! 👍' : 'Thanks for the feedback! 👎'}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <ReactMarkdown
                        components={{ table: (props) => <table {...props} className="chat-table" /> }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="chat-bubble ai">
                <div className="ai-icon">🤖</div>
                <div className="message-content">
                  <div className="thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Guided Query Builder - show only when no conversation started */}
          {messages.length === 0 && showQueryBuilder && (
            <div className="guided-query-builder">
              <h3 className="builder-title">Build A Query</h3>
              <div className="query-controls">
                <div className="control-group">
                  <label>Year</label>
                  <select onChange={(e) => buildAndSendQuery(e.target.value ? parseInt(e.target.value) : null, null, null)}>
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year.value} value={year.value}>{year.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="control-group">
                  <label>Agency</label>
                  <select onChange={(e) => buildAndSendQuery(null, e.target.value || null, null)}>
                    <option value="">Select Agency</option>
                    {agencies.map(agency => (
                      <option key={agency.value} value={agency.value}>{agency.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="control-group">
                  <label>State</label>
                  <select onChange={(e) => buildAndSendQuery(null, null, e.target.value || null)}>
                    <option value="">Select State</option>
                    {states.map(state => (
                      <option key={state.value} value={state.value}>{state.label} ({state.value})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Sample Queries Section - Show only when no messages exist */}
          {messages.length === 0 && (
            <div className="sample-queries">
              <p className="sample-query-heading">Try asking:</p>
              <div className="sample-query-grid">
                {sampleQueries.map((query, index) => (
                  <button 
                    key={index}
                    className="sample-query-btn"
                    onClick={() => handleSampleQuery(query)}
                  >
                    "{query}"
                  </button>
                ))}
              </div>
            </div>
          )}

          <form ref={formRef} className="chat-input-form" onSubmit={handleSend}>
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
      </main>
    </div>
  );
}