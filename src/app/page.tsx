"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { sendMessageToAI, clearConversation } from "@/lib/sendMessageToAI";
import "./globals.css";

/* ---------- Markdown helpers ---------- */
const LABELS = [
  "FY Year", "Amount", "Location",
  "Subcommittee", "Department", "Agency",
  "Account", "Member"
];

/* ——————————————————————————————————————————
   Converts AI record text → Markdown list
   • Splits raw text into individual records (blank‑line separated)
   • Formats each record:
     – First line ➜ bold project title
     – Standard labels (FY Year, Amount, etc.) ➜ bold
   • Returns an **ordered list** so your CSS card styles apply
—————————————————————————————————————————— */
function formatAIResponse(raw: string): string {
  if (!raw) return '';

  const labelPattern =
    /^(FY Year|Amount|Location|Subcommittee|Department|Agency|Account|Member):/i;

  // 1) Split on blank lines ⇒ separate records
  const records = raw
    .trim()
    .split(/\n\s*\n/)      // one or more blank lines
    .filter(Boolean);

  // 2) Format each record
  const formattedRecords = records.map(rec => {
    const lines = rec.split('\n').map((ln, idx) => {
      const trimmed = ln.trim();
      if (!trimmed) return '';

      // First line = project title
      if (idx === 0) return `**${trimmed}**`;

      // Bold recognised labels
      if (labelPattern.test(trimmed)) {
        return trimmed.replace(labelPattern, match => `**${match}**`);
      }

      return trimmed;
    });

    // Collapse stray blank lines inside a record
    return lines.filter((l, i, arr) => l || arr[i - 1]).join('\n');
  });

  // 3) Build an ordered‑list Markdown string
  return formattedRecords
    .map((rec, idx) => `${idx + 1}. ${rec}`)
    .join('\n\n');
}

/* ── Types ─────────────────────────────────────────── */
type Message = {
  text: string;
  sender: 'user' | 'ai';
  typing?: boolean;
  id?: number;
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
export default function EnhancedHomePage() {
  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'up' | 'down' | null>>({});
  const [showQueryBuilder, setShowQueryBuilder] = useState(true);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  /* Predefined options for query builder */
  const agencies = [
    { value: "", label: "Select Agency" },
    { value: "Labor", label: "Department of Labor" },
    { value: "Transportation", label: "Department of Transportation" },
    { value: "Health and Human Services", label: "Department of Health and Human Services" },
    { value: "Housing and Urban Development", label: "Department of Housing and Urban Development" },
    { value: "Education", label: "Department of Education" },
    { value: "Defense", label: "Department of Defense" }
  ];

  const years = [
    { value: "", label: "Select Year" },
    { value: 2022, label: "2022" },
    { value: 2023, label: "2023" },
    { value: 2024, label: "2024" }
  ];

  const states = [
    { value: "", label: "Select State" },
    { value: "CA", label: "California" },
    { value: "TX", label: "Texas" },
    { value: "NY", label: "New York" },
    { value: "FL", label: "Florida" },
    { value: "PA", label: "Pennsylvania" },
    { value: "NJ", label: "New Jersey" }
  ];
  
  /* Sample queries to display */
  const sampleQueries = [
    {
      text: "Show me earmarks from the Department of Education in 2022",
      icon: "🎓",
      category: "Education"
    },
    {
      text: "What are the largest earmarks over $1 million?",
      icon: "💰",
      category: "High Value"
    },
    {
      text: "Which agencies received the most funding in 2023?",
      icon: "📊",
      category: "Analysis"
    },
    {
      text: "Show me earmarks for healthcare projects",
      icon: "🏥",
      category: "Healthcare"
    },
    {
      text: "Who requested the most earmarks in California?",
      icon: "🌴",
      category: "Regional"
    },
    {
      text: "What are the rules for requesting earmarks?",
      icon: "📋",
      category: "Process"
    }
  ];

  /* Auto-resize textarea */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  /* Scroll to latest message */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Send user text to backend */
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
      /* set typing flag so CSS animation shows */
      setMessages((ms) => [...ms, { 
        text: "", 
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
          
          const yearMatch = filterText.match(/Year: (\d{4})/);
          if (yearMatch) filters.year = parseInt(yearMatch[1]);
          
          const agencyMatch = filterText.match(/Agency: Department of ([^,]+)/);
          if (agencyMatch) filters.agency = agencyMatch[1].trim();
          
          const locationMatch = filterText.match(/Location: ([^,]+)/);
          if (locationMatch) filters.location = locationMatch[1].trim();
          
          const memberMatch = filterText.match(/Member: ([^,]+)/);
          if (memberMatch) filters.member = memberMatch[1].trim();
          
          const minAmountMatch = filterText.match(/Minimum Amount: \$([0-9,]+)/);
          if (minAmountMatch) filters.minAmount = parseInt(minAmountMatch[1].replace(/,/g, ''));
          
          const maxAmountMatch = filterText.match(/Maximum Amount: \$([0-9,]+)/);
          if (maxAmountMatch) filters.maxAmount = parseInt(maxAmountMatch[1].replace(/,/g, ''));
          
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
        { text: "Sorry, I'm having trouble connecting right now. Please try again.", sender: "ai", id: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }
  
  /* Handle clicking on a sample query */
  function handleSampleQuery(query: string) {
    setInput(query);
    // Focus the input and auto-submit
    setTimeout(() => {
      inputRef.current?.focus();
      formRef.current?.requestSubmit();
    }, 100);
  }

  /* Build and send query from guided query builder */
  function buildAndSendQuery(year?: number | null, agency?: string | null, state?: string | null) {
    if (!year && !agency && !state) {
      return;
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
    
    setTimeout(() => {
      inputRef.current?.focus();
      formRef.current?.requestSubmit();
    }, 300);
  }

  /* Handle feedback for responses */
  function handleFeedback(messageId: number, type: 'up' | 'down') {
    setFeedbackGiven(prev => ({
      ...prev,
      [messageId]: type
    }));
    
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
    clearConversation();
    setFeedbackGiven({});
    setShowQueryBuilder(true);
    setParsedQuery(null);
    setInput("");
  }

  /* Dark‑mode toggle */
  function toggleTheme() {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "" : "dark";
  }


  /* Format earmark-specific data sections */
  function formatEarmarkData(text: string) {
    const formattedText = text.replace(/\$[\d,.]+ (?:m(?:illion)?)?/g, (match) => {
      const isLarge = match.includes('million') || 
                     parseInt(match.replace(/[$,]/g, '')) >= 1000000;
      
      return `<span class="amount ${isLarge ? 'large' : ''}">${match}</span>`;
    });
    
    const sections = formattedText.split('\n\n');
    
    return (
      <div className="earmark-results">
        {sections.map((section, i) => {
          if (section.includes("SAMPLE RECORDS:")) {
            const recordsContent = section.replace("SAMPLE RECORDS:", "").trim();
            console.log("DEBUG - Raw records content:", recordsContent);
            
            // Split projects by numbered lines (1., 2., etc.) or by double newlines
            const projects = recordsContent.split(/(?=\d+\.\s)|(?:\n\n)/).filter(line => line.trim());
            console.log("DEBUG - Split projects:", projects);
            
            return (
              <div key={i} className="records-section">
                <h4>📋 Projects</h4>
                <div className="project-list">
                  {projects.map((project, index) => {
                    console.log("DEBUG - Raw project:", project);
                    
                    // Extract title - first line or numbered line
                    const lines = project.trim().split('\n');
                    let title = lines[0].trim();
                    
                    // Remove number prefix if present
                    title = title.replace(/^\d+\.\s*/, '');
                    
                    // Parse field-value pairs from all lines
                    const details: Record<string, string> = {};
                    
                    lines.forEach(line => {
                      const trimmedLine = line.trim();
                      
                      // Skip empty lines and the title line
                      if (!trimmedLine || trimmedLine === title) return;
                      
                      // Look for "Field: Value" pattern
                      const colonIndex = trimmedLine.indexOf(':');
                      if (colonIndex > 0) {
                        const key = trimmedLine.substring(0, colonIndex).trim();
                        const value = trimmedLine.substring(colonIndex + 1).trim();
                        
                        // Convert key to lowercase for consistent lookup
                        details[key.toLowerCase()] = value;
                      }
                    });
                    
                    console.log("DEBUG - Project title:", title);
                    console.log("DEBUG - Project details:", details);

                    return (
                      <div key={index} className="project-card">
                        <div className="project-header">
                          <div className="project-number">{index + 1}</div>
                          <h3 className="project-title">{title}</h3>
                        </div>
                        <div className="project-details">
                          {details['fy year'] && (
                            <div className="project-detail">
                              <span className="detail-label">FY Year</span>
                              <span className="detail-value">{details['fy year']}</span>
                            </div>
                          )}
                          {details.amount && (
                            <div className="project-detail">
                              <span className="detail-label">Amount</span>
                              <span className="detail-value amount-value">{details.amount}</span>
                            </div>
                          )}
                          {details.location && (
                            <div className="project-detail">
                              <span className="detail-label">Location</span>
                              <span className="detail-value">{details.location}</span>
                            </div>
                          )}
                          {details.subcommittee && (
                            <div className="project-detail">
                              <span className="detail-label">Subcommittee</span>
                              <span className="detail-value">{details.subcommittee}</span>
                            </div>
                          )}
                          {details.department && (
                            <div className="project-detail">
                              <span className="detail-label">Department</span>
                              <span className="detail-value">{details.department}</span>
                            </div>
                          )}
                          {details.agency && (
                            <div className="project-detail">
                              <span className="detail-label">Agency</span>
                              <span className="detail-value">{details.agency}</span>
                            </div>
                          )}
                          {details.account && (
                            <div className="project-detail">
                              <span className="detail-label">Account</span>
                              <span className="detail-value">{details.account}</span>
                            </div>
                          )}
                          {details.member && (
                            <div className="project-detail full-width">
                              <span className="detail-label">Member</span>
                              <span className="detail-value member-value">{details.member}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          } 
          else if (section.includes("STATISTICS:")) {
            return (
              <div key={i} className="stats-section">
                <h4>📊 Key Statistics</h4>
                <div className="stats-grid">
                  {section.replace("STATISTICS:", "").trim().split('\n').map((stat, j) => {
                    const cleanStat = stat.trim().replace(/^-\s*/, '');
                    return (
                      <div key={j} className="stat-card"
                          dangerouslySetInnerHTML={{ __html: cleanStat }} />
                    );
                  })}
                </div>
              </div>
            );
          }
          else if (section.includes("records found") || section.includes("DATABASE CONTEXT:")) {
            return <div key={i} className="info-banner" dangerouslySetInnerHTML={{ __html: section }} />;
          }
          else if (section.includes("DOCUMENT SEARCH")) {
            return (
              <div key={i} className="document-section">
                <h4>📄 Document Sources</h4>
                <div className="document-content" dangerouslySetInnerHTML={{ __html: section }} />
              </div>
            );
          }
          return formatTextSection(section, i);
        })}
      </div>
    );
  }

  /* Format general AI responses with proper paragraphs and structure */
  function formatGeneralResponse(text: string) {
    // Split into paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    return (
      <div className="response-content">
        {paragraphs.map((paragraph, i) => {
          const trimmed = paragraph.trim();
          
          // Check if it's a heading (starts with specific patterns)
          if (isHeading(trimmed)) {
            return formatHeading(trimmed, i);
          }
          
          // Check if it's a list
          if (isList(trimmed)) {
            return formatList(trimmed, i);
          }
          
          // Check if it's a quote or callout
          if (isCallout(trimmed)) {
            return formatCallout(trimmed, i);
          }
          
          // Regular paragraph
          return (
            <div key={i} className="response-paragraph">
              <ReactMarkdown
                remarkPlugins={[remarkBreaks, remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >{trimmed}</ReactMarkdown>
            </div>
          );
        })}
      </div>
    );
  }

  /* Helper functions for response formatting */
  function isHeading(text: string): boolean {
    return /^(#{1,6}\s|[A-Z][^.!?]*:$|^\*\*[^*]+\*\*$)/.test(text) ||
           text.includes('INSTRUCTIONS:') ||
           text.includes('KEY POINTS:') ||
           text.includes('SUMMARY:') ||
           text.includes('FINDINGS:');
  }

  function isList(text: string): boolean {
    const lines = text.split('\n');
    return lines.length > 1 && lines.some(line => 
      /^\s*[-*+•]\s/.test(line) || /^\s*\d+\.\s/.test(line)
    );
  }

  function isCallout(text: string): boolean {
    return text.startsWith('**Note:') || 
           text.startsWith('**Important:') ||
           text.startsWith('**Remember:') ||
           text.includes('💡') ||
           text.includes('⚠️') ||
           text.includes('ℹ️');
  }

  function formatHeading(text: string, key: number) {
    const cleanText = text.replace(/^#+\s*/, '').replace(/^\*\*|\*\*$/g, '');
    return (
      <div key={key} className="response-heading">
        <h4>{cleanText}</h4>
      </div>
    );
  }

  function formatList(text: string, key: number) {
    const lines = text.split('\n').filter(line => line.trim());
    const isNumbered = /^\s*\d+\./.test(lines[0]);
    
    return (
      <div key={key} className="response-list">
        {isNumbered ? (
          <ol>
            {lines.map((line, i) => (
              <li key={i}>
                <ReactMarkdown
                  remarkPlugins={[remarkBreaks, remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >{line.replace(/^\s*\d+\.\s*/, '')}</ReactMarkdown>
              </li>
            ))}
          </ol>
        ) : (
          <ul>
            {lines.map((line, i) => (
              <li key={i}>
                <ReactMarkdown
                  remarkPlugins={[remarkBreaks, remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >{line.replace(/^\s*[-*+•]\s*/, '')}</ReactMarkdown>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function formatCallout(text: string, key: number) {
    let type = 'info';
    let icon = 'ℹ️';
    
    if (text.includes('**Important:') || text.includes('⚠️')) {
      type = 'warning';
      icon = '⚠️';
    } else if (text.includes('**Note:') || text.includes('💡')) {
      type = 'tip';
      icon = '💡';
    }
    
    return (
      <div key={key} className={`response-callout ${type}`}>
        <div className="callout-icon">{icon}</div>
        <div className="callout-content">
          <ReactMarkdown
            remarkPlugins={[remarkBreaks, remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >{text}</ReactMarkdown>
        </div>
      </div>
    );
  }

  function formatTextSection(text: string, key: number) {
    // Handle dollar amounts in any text section
    const withFormattedAmounts = text.replace(/\$[\d,.]+ (?:m(?:illion)?)?/g, (match) => {
      const isLarge = match.includes('million') || 
                     parseInt(match.replace(/[$,]/g, '')) >= 1000000;
      
      return `<span class="amount ${isLarge ? 'large' : ''}">${match}</span>`;
    });
    
    return (
      <div key={key} className="response-paragraph" 
           dangerouslySetInnerHTML={{ __html: withFormattedAmounts }} />
    );
  }

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <Link href="/" className="app-logo">
            <img src="/mosaic-logo.svg" alt="MOSAIC" className="logo-image" width="200" height="60" />
          </Link>
          
          <div className="header-actions">
            <Link href="/admin" className="header-btn">
              📚 Admin
            </Link>
            <button 
              onClick={handleClearChat} 
              className="header-btn" 
              disabled={messages.length === 0}
            >
              ✨ New Chat
            </button>
            <button onClick={toggleTheme} className="header-btn">
              🌙 Theme
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Hero Section */}
          {messages.length === 0 && (
            <div className="hero-section">
              <div className="hero-badge">
                <span>✨</span>
                AI-Powered Federal Earmark Analysis
              </div>
              <h1 className="hero-title text-balance">
                Discover Federal Earmarks with Natural Language
              </h1>
              <p className="hero-subtitle">
                Ask questions about federal funding, analyze earmark data, and explore government spending patterns using our AI-powered search interface.
              </p>
            </div>
          )}

          {/* Chat Interface */}
          <div className="chat-container">
            <div className="chat-panel">
              <div className="chat-header">
                <h2 className="chat-title">💬 AI Earmark Assistant</h2>
              </div>

              {/* Query Understanding Display */}
              {parsedQuery && Object.keys(parsedQuery).length > 0 && (
                <div className="query-understanding">
                  <h4>🎯 Query understood as:</h4>
                  <div className="parsed-filters">
                    {parsedQuery.year && <span className="filter-tag">📅 {parsedQuery.year}</span>}
                    {parsedQuery.agency && <span className="filter-tag">🏛️ Department of {parsedQuery.agency}</span>}
                    {parsedQuery.location && <span className="filter-tag">📍 {parsedQuery.location}</span>}
                    {parsedQuery.member && <span className="filter-tag">👤 {parsedQuery.member}</span>}
                    {parsedQuery.minAmount && <span className="filter-tag">💰 Min: ${parsedQuery.minAmount.toLocaleString()}</span>}
                    {parsedQuery.maxAmount && <span className="filter-tag">💰 Max: ${parsedQuery.maxAmount.toLocaleString()}</span>}
                  </div>
                </div>
              )}

              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="welcome-card">
                    <div className="welcome-icon">🔍</div>
                    <h3 className="welcome-title">Welcome to Mosaic</h3>
                    <p className="welcome-description">
                      Ask questions about federal earmarks and funding data. I can help you analyze spending patterns, 
                      find specific allocations, and understand the earmark process.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble ${msg.sender}`}>
                      <div className="message-avatar">
                        {msg.sender === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-content">
                        {msg.sender === "ai" && !msg.typing ? (
                          <>
                            <div className="message-text">
                              <ReactMarkdown
                                remarkPlugins={[remarkBreaks, remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  p: ({node, ...props}) => <p {...props} />,
                                  strong: ({node, ...props}) => <strong {...props} />,
                                  em: ({node, ...props}) => <em {...props} />,
                                  ol: ({node, ...props}) => <ol {...props} />,
                                  ul: ({node, ...props}) => <ul {...props} />,
                                  li: ({node, ...props}) => <li {...props} />
                                }}
                              >
                                {formatAIResponse(msg.text)}
                              </ReactMarkdown>
                            </div>
                            {msg.id && (
                              <div className="message-feedback">
                                {!feedbackGiven[msg.id] ? (
                                  <div className="feedback-buttons">
                                    <button 
                                      onClick={() => handleFeedback(msg.id!, 'up')}
                                      className="feedback-btn like"
                                      aria-label="Helpful"
                                    >
                                      👍
                                    </button>
                                    <button 
                                      onClick={() => handleFeedback(msg.id!, 'down')}
                                      className="feedback-btn dislike"
                                      aria-label="Not helpful"
                                    >
                                      👎
                                    </button>
                                  </div>
                                ) : (
                                  <div className="feedback-thanks">
                                    Thanks for the feedback! {feedbackGiven[msg.id] === 'up' ? '👍' : '👎'}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : msg.typing ? (
                          <div className="loading-dots">
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                            <div className="loading-dot"></div>
                          </div>
                        ) : (
                          <div className="message-text">
                            <ReactMarkdown
                              remarkPlugins={[remarkBreaks, remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                p: ({node, ...props}) => <p {...props} />,
                                strong: ({node, ...props}) => <strong {...props} />,
                                em: ({node, ...props}) => <em {...props} />,
                                ol: ({node, ...props}) => <ol {...props} />,
                                ul: ({node, ...props}) => <ul {...props} />,
                                li: ({node, ...props}) => <li {...props} />
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Query Builder - show only when no conversation started */}
              {messages.length === 0 && showQueryBuilder && (
                <div className="query-builder">
                  <h3 className="builder-title">
                    🛠️ Quick Query Builder
                  </h3>
                  <div className="builder-controls">
                    <div className="control-group">
                      <label className="control-label">Year</label>
                      <select 
                        className="control-select"
                        onChange={(e) => buildAndSendQuery(e.target.value ? parseInt(e.target.value) : null, null, null)}
                      >
                        {years.map(year => (
                          <option key={year.value} value={year.value}>{year.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="control-group">
                      <label className="control-label">Agency</label>
                      <select 
                        className="control-select"
                        onChange={(e) => buildAndSendQuery(null, e.target.value || null, null)}
                      >
                        {agencies.map(agency => (
                          <option key={agency.value} value={agency.value}>{agency.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="control-group">
                      <label className="control-label">State</label>
                      <select 
                        className="control-select"
                        onChange={(e) => buildAndSendQuery(null, null, e.target.value || null)}
                      >
                        {states.map(state => (
                          <option key={state.value} value={state.value}>{state.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Queries Section */}
              {messages.length === 0 && (
                <div className="sample-queries">
                  <h3 className="sample-queries-title">💡 Try asking:</h3>
                  <div className="sample-queries-grid">
                    {sampleQueries.map((query, index) => (
                      <div 
                        key={index}
                        className="sample-query-card"
                        onClick={() => handleSampleQuery(query.text)}
                      >
                        <div className="query-icon">{query.icon}</div>
                        <p className="sample-query-text">{query.text}</p>
                        <div className="query-category">{query.category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="chat-input-container">
                <form ref={formRef} className="chat-input-form" onSubmit={handleSend}>
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder="Ask me anything about federal earmarks... (Shift+Enter for new line)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    rows={1}
                  />
                  <button
                    className="chat-send-btn"
                    type="submit"
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-dots">
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                        </div>
                        Thinking...
                      </>
                    ) : (
                      <>
                        Send
                        <span>🚀</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}