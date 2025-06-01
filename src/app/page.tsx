"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { sendMessageToAI, clearConversation } from "@/lib/sendMessageToAI";
import "./globals.css";

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
export default function ProfessionalHomePage() {
  /* Chat state */
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, 'up' | 'down' | null>>({});
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        const filterMatch = aiResponse.match(/Applied Filters: ([^]*?)(?:Number|$)/);
        if (filterMatch && filterMatch[1]) {
          const filters: ParsedQuery = {};
          const filterText = filterMatch[1].trim();
          
          const yearMatch = filterText.match(/Year: FY(\d{4})/);
          if (yearMatch) filters.year = parseInt(yearMatch[1]);
          
          const agencyMatch = filterText.match(/Agency: Department of ([^,|]+)/);
          if (agencyMatch) filters.agency = agencyMatch[1].trim();
          
          const locationMatch = filterText.match(/Location: ([^,|]+)/);
          if (locationMatch) filters.location = locationMatch[1].trim();
          
          const memberMatch = filterText.match(/Member: ([^,|]+)/);
          if (memberMatch) filters.member = memberMatch[1].trim();
          
          const minAmountMatch = filterText.match(/Min Amount: \$([0-9,]+)/);
          if (minAmountMatch) filters.minAmount = parseInt(minAmountMatch[1].replace(/,/g, ''));
          
          const maxAmountMatch = filterText.match(/Max Amount: \$([0-9,]+)/);
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
        { text: "I'm experiencing connectivity issues. Please try again in a moment.", sender: "ai", id: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
    }
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
    setParsedQuery(null);
    setInput("");
  }

  /* Dark‑mode toggle */
  function toggleTheme() {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "" : "dark";
  }

  /* ——————————————————————————————————————————
     Format AI response for better display
  —————————————————————————————————————————— */
  function formatAIResponse(raw: string): string {
    const labelPattern = /^(FY Year|Amount|Location|Subcommittee|Department|Agency|Account|Member):/i;

    const lines = (raw ?? '')
      .split('\n')
      .map((ln, idx) => {
        const trimmed = ln.trim();
        if (!trimmed) return '';

        // First non‑blank line → treat as project title
        if (idx === 0) {
          return `**${trimmed}**`;
        }

        // Bold recognised labels
        if (labelPattern.test(trimmed)) {
          return trimmed.replace(labelPattern, match => `**${match}**`);
        }

        return trimmed;
      });

    return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
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
            
            const projects = recordsContent.split(/(?=\d+\.\s)|(?:\n\n)/).filter(line => line.trim());
            
            return (
              <div key={i} className="records-section">
                <h4>📊 Federal Funding Projects</h4>
                <div className="project-list">
                  {projects.map((project, index) => {
                    const lines = project.trim().split('\n');
                    let title = lines[0].trim();
                    
                    title = title.replace(/^\d+\.\s*/, '');
                    
                    const details: Record<string, string> = {};
                    
                    lines.forEach(line => {
                      const trimmedLine = line.trim();
                      
                      if (!trimmedLine || trimmedLine === title) return;
                      
                      const colonIndex = trimmedLine.indexOf(':');
                      if (colonIndex > 0) {
                        const key = trimmedLine.substring(0, colonIndex).trim();
                        const value = trimmedLine.substring(colonIndex + 1).trim();
                        details[key.toLowerCase()] = value;
                      }
                    });

                    return (
                      <div key={index} className="project-card">
                        <div className="project-header">
                          <div className="project-number">{index + 1}</div>
                          <h3 className="project-title">{title}</h3>
                        </div>
                        <div className="project-details">
                          {details['fy year'] && (
                            <div className="project-detail">
                              <span className="detail-label">Fiscal Year</span>
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
                              <span className="detail-label">Congressional Member</span>
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
          else if (section.includes("ANALYSIS CONTEXT:")) {
            return (
              <div key={i} className="stats-section">
                <h4>📈 Analysis Summary</h4>
                <div className="stats-grid">
                  {section.replace("ANALYSIS CONTEXT:", "").trim().split('\n').map((stat, j) => {
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
          else if (section.includes("DOCUMENT CONTEXT")) {
            return (
              <div key={i} className="document-section">
                <h4>📄 Reference Sources</h4>
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
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    return (
      <div className="response-content">
        {paragraphs.map((paragraph, i) => {
          const trimmed = paragraph.trim();
          
          if (isHeading(trimmed)) {
            return formatHeading(trimmed, i);
          }
          
          if (isList(trimmed)) {
            return formatList(trimmed, i);
          }
          
          if (isCallout(trimmed)) {
            return formatCallout(trimmed, i);
          }
          
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
           text.includes('GUIDANCE:') ||
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
      {/* Professional Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">M</div>
            <div>
              <div className="logo-text">MOSAIC</div>
              <p className="capabilities-text">
                AI-powered federal funding analysis with natural language search across Congressional earmarks and appropriations data
              </p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={handleClearChat} 
              className="header-btn" 
              disabled={messages.length === 0}
            >
              ✨ New Session
            </button>
            <button onClick={toggleTheme} className="header-btn">
              🌙 Theme
            </button>
            <Link href="/admin" className="header-btn primary">
              ⚙️ Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          {/* Professional Hero Section */}
          {messages.length === 0 && (
            <div className="hero-section">
              <div className="hero-badge">
                <span>🏛️</span>
                Federal Intelligence Platform
              </div>
              <h1 className="hero-title">
                UNLOCK FEDERAL FUNDING INSIGHTS
              </h1>
              <p className="hero-subtitle">
                Search, analyze, and understand Congressional earmarks and federal appropriations using advanced AI. 
                Get instant answers about government funding, agency allocations, and legislative patterns.
              </p>
            </div>
          )}

          {/* Professional Chat Interface */}
          <div className="chat-container">
            <div className="chat-panel">
              <div className="chat-header">
                <h2 className="chat-title">🤖 Federal Funding AI Assistant</h2>
              </div>

              {/* Query Understanding Display */}
              {parsedQuery && Object.keys(parsedQuery).length > 0 && (
                <div className="query-understanding">
                  <h4>🎯 Query Analysis:</h4>
                  <div className="parsed-filters">
                    {parsedQuery.year && <span className="filter-tag">📅 FY{parsedQuery.year}</span>}
                    {parsedQuery.agency && <span className="filter-tag">🏛️ {parsedQuery.agency}</span>}
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
                    <h3 className="welcome-title">Federal Funding Intelligence</h3>
                    <p className="welcome-description">
                      Ask questions about Congressional earmarks, federal appropriations, agency funding, 
                      or legislative patterns. Our AI analyzes government spending data to provide 
                      comprehensive insights and actionable intelligence.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble ${msg.sender}`}>
                      <div className="message-avatar">
                        {msg.sender === 'user' ? '🏛️' : '🤖'}
                      </div>
                      <div className="message-content">
                        {msg.sender === "ai" && !msg.typing ? (
                          <>
                            {msg.text.includes('SAMPLE RECORDS:') || msg.text.includes('ANALYSIS CONTEXT:') ? (
                              <div className="message-text">
                                <ReactMarkdown
                                  remarkPlugins={[remarkBreaks, remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    p:      ({node, ...props}) => <p {...props} />,
                                    strong: ({node, ...props}) => <strong {...props} />,
                                    em:     ({node, ...props}) => <em {...props} />,
                                    ol:     ({node, ...props}) => <ol {...props} />,
                                    ul:     ({node, ...props}) => <ul {...props} />,
                                    li:     ({node, ...props}) => <li {...props} />
                                  }}
                                >
                                  {formatAIResponse(msg.text)}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              formatGeneralResponse(msg.text)
                            )}
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
                                    Feedback received {feedbackGiven[msg.id] === 'up' ? '👍' : '👎'}
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

              {/* Professional Chat Input */}
              <div className="chat-input-container">
                <form ref={formRef} className="chat-input-form" onSubmit={handleSend}>
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder="Ask about federal funding, earmarks, agency allocations, or legislative patterns... (Shift+Enter for new line)"
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
                        Processing
                      </>
                    ) : (
                      <>
                        Analyze
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