/* ────────────────────── Enhanced Conversation Memory System - Phase 2 ─────────────────── */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    resultCount?: number;
    confidence?: number;
    queryTime?: number;
    equipmentType?: string;
  };
}

export interface QueryPattern {
  query: string;
  filters: any;
  resultCount: number;
  intent: string;
  timestamp: number;
  success: boolean;
  equipmentType?: string;
}

export interface UserPreferences {
  preferredDataSize: 'summary' | 'detailed' | 'comprehensive';
  commonFilters: {
    favoriteAgencies?: string[];
    preferredYears?: number[];
    commonLocations?: string[];
    frequentEquipment?: string[];
  };
  queryStyle: 'technical' | 'conversational' | 'guidance';
  lastQueryIntent: string;
  responseFormat: 'list' | 'narrative' | 'guidance';
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
}

export interface SessionContext {
  currentFocus?: {
    agency?: string;
    year?: number;
    location?: string;
    member?: string;
    equipmentType?: string;
  };
  querySequence: string[];
  topicProgression: string[];
  sessionGoals: string[];
  lastSuccessfulQuery?: string;
}

export interface EnhancedConversation {
  messages: Message[];
  queryPatterns: QueryPattern[];
  userPreferences: UserPreferences;
  sessionContext: SessionContext;
  lastUpdated: number;
  sessionStarted: number;
  totalQueries: number;
  successfulQueries: number;
}

// Configuration
const MAX_MESSAGES = 20;
const MAX_QUERY_PATTERNS = 50;
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const LEARNING_THRESHOLD = 3; // Queries needed to start learning

// Enhanced in-memory store with automatic cleanup
const conversations: Record<string, EnhancedConversation> = {};

/* ────────────────────── Session Management ─────────────────── */

/**
 * Initialize or get conversation session
 */
function initializeSession(sessionId: string): EnhancedConversation {
  if (!conversations[sessionId]) {
    conversations[sessionId] = {
      messages: [],
      queryPatterns: [],
      userPreferences: {
        preferredDataSize: 'summary',
        commonFilters: {},
        queryStyle: 'conversational',
        lastQueryIntent: 'search',
        responseFormat: 'narrative',
        expertiseLevel: 'intermediate'
      },
      sessionContext: {
        querySequence: [],
        topicProgression: [],
        sessionGoals: []
      },
      lastUpdated: Date.now(),
      sessionStarted: Date.now(),
      totalQueries: 0,
      successfulQueries: 0
    };
  }
  
  // Clean up old sessions periodically
  cleanupOldSessions();
  
  return conversations[sessionId];
}

/**
 * Clean up sessions older than timeout period
 */
function cleanupOldSessions(): void {
  const now = Date.now();
  const sessionIds = Object.keys(conversations);
  
  for (const sessionId of sessionIds) {
    const session = conversations[sessionId];
    if (now - session.lastUpdated > SESSION_TIMEOUT) {
      delete conversations[sessionId];
      console.log(`🧹 Cleaned up expired session: ${sessionId}`);
    }
  }
}

/* ────────────────────── Enhanced Message Management ─────────────────── */

/**
 * Add message with enhanced metadata and learning
 */
export function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Message['metadata']
): void {
  const session = initializeSession(sessionId);
  
  const message: Message = {
    role,
    content,
    timestamp: Date.now(),
    metadata
  };
  
  session.messages.push(message);
  session.lastUpdated = Date.now();
  
  // Update session context based on message
  if (role === 'user') {
    session.totalQueries++;
    session.sessionContext.querySequence.push(content);
    
    // Extract topic for progression tracking
    const topic = extractTopic(content);
    if (topic && !session.sessionContext.topicProgression.includes(topic)) {
      session.sessionContext.topicProgression.push(topic);
    }
    
    // Extract session goals
    const goal = extractGoal(content);
    if (goal && !session.sessionContext.sessionGoals.includes(goal)) {
      session.sessionContext.sessionGoals.push(goal);
    }
    
    // Update expertise level
    updateExpertiseLevel(session, content);
  }
  
  // Track successful queries
  if (role === 'assistant' && metadata?.resultCount && metadata.resultCount > 0) {
    session.successfulQueries++;
    session.sessionContext.lastSuccessfulQuery = session.sessionContext.querySequence[session.sessionContext.querySequence.length - 1];
  }
  
  // Trim messages if needed
  if (session.messages.length > MAX_MESSAGES) {
    session.messages = session.messages.slice(-MAX_MESSAGES);
  }
  
  // Trim query sequence
  if (session.sessionContext.querySequence.length > 10) {
    session.sessionContext.querySequence = session.sessionContext.querySequence.slice(-10);
  }
  
  console.log(`💬 Message added to session ${sessionId}: ${role} - ${content.substring(0, 50)}...`);
}

/**
 * Extract topic from user query for progression tracking
 */
function extractTopic(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  // Agency topics
  if (lowerQuery.includes('labor') || lowerQuery.includes('dol')) return 'Department of Labor';
  if (lowerQuery.includes('education') || lowerQuery.includes('ed')) return 'Department of Education';
  if (lowerQuery.includes('transportation') || lowerQuery.includes('dot')) return 'Department of Transportation';
  if (lowerQuery.includes('defense') || lowerQuery.includes('dod')) return 'Department of Defense';
  if (lowerQuery.includes('health') || lowerQuery.includes('hhs')) return 'Department of Health and Human Services';
  if (lowerQuery.includes('veterans') || lowerQuery.includes('va')) return 'Department of Veterans Affairs';
  if (lowerQuery.includes('housing') || lowerQuery.includes('hud')) return 'Department of Housing and Urban Development';
  
  // Equipment topics
  if (lowerQuery.includes('mri') || lowerQuery.includes('medical imaging')) return 'Medical Equipment';
  if (lowerQuery.includes('hospital') || lowerQuery.includes('healthcare')) return 'Healthcare Infrastructure';
  if (lowerQuery.includes('research') || lowerQuery.includes('laboratory')) return 'Research & Development';
  if (lowerQuery.includes('infrastructure') || lowerQuery.includes('construction')) return 'Infrastructure';
  
  // Process topics
  if (lowerQuery.includes('compare') || lowerQuery.includes('analysis')) return 'Comparative Analysis';
  if (lowerQuery.includes('trend') || lowerQuery.includes('over time')) return 'Trend Analysis';
  if (lowerQuery.includes('guidance') || lowerQuery.includes('best') || lowerQuery.includes('how to')) return 'Funding Guidance';
  
  return null;
}

/**
 * Extract session goals from queries
 */
function extractGoal(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('funding') && (lowerQuery.includes('mri') || lowerQuery.includes('equipment'))) {
    return 'Equipment Funding Research';
  }
  if (lowerQuery.includes('compare') && lowerQuery.includes('agencies')) {
    return 'Agency Comparison Analysis';
  }
  if (lowerQuery.includes('trends') || lowerQuery.includes('over time')) {
    return 'Trend Analysis';
  }
  if (lowerQuery.includes('largest') || lowerQuery.includes('biggest')) {
    return 'Finding Large Earmarks';
  }
  
  return null;
}

/**
 * Update user expertise level based on query complexity
 */
function updateExpertiseLevel(session: EnhancedConversation, query: string): void {
  const complexityIndicators = {
    beginner: ['show me', 'what are', 'list all', 'how many', 'best account', 'help me'],
    intermediate: ['compare', 'analysis', 'trends', 'between', 'over time'],
    expert: ['correlation', 'regression', 'methodology', 'appropriations process', 'subcommittee allocation']
  };
  
  const lowerQuery = query.toLowerCase();
  
  for (const [level, indicators] of Object.entries(complexityIndicators)) {
    if (indicators.some(indicator => lowerQuery.includes(indicator))) {
      session.sessionContext.expertiseLevel = level as any;
      session.userPreferences.expertiseLevel = level as any;
      break;
    }
  }
}

/* ────────────────────── Query Pattern Learning ─────────────────── */

/**
 * Add query pattern for learning and optimization
 */
export function addQueryPattern(sessionId: string, pattern: Omit<QueryPattern, 'timestamp' | 'success'>): void {
  const session = initializeSession(sessionId);
  
  const queryPattern: QueryPattern = {
    ...pattern,
    timestamp: Date.now(),
    success: pattern.resultCount > 0
  };
  
  session.queryPatterns.push(queryPattern);
  
  // Trim patterns if needed
  if (session.queryPatterns.length > MAX_QUERY_PATTERNS) {
    session.queryPatterns = session.queryPatterns.slice(-MAX_QUERY_PATTERNS);
  }
  
  // Learn from patterns if we have enough data
  if (session.queryPatterns.length >= LEARNING_THRESHOLD) {
    learnFromPatterns(session);
  }
  
  console.log(`🧠 Query pattern added for session ${sessionId}: ${pattern.intent} - ${pattern.resultCount} results`);
}

/**
 * Learn user preferences from query patterns
 */
function learnFromPatterns(session: EnhancedConversation): void {
  const recentPatterns = session.queryPatterns.slice(-10);
  
  // Learn preferred data size
  const avgResultSize = recentPatterns.reduce((sum, p) => sum + p.resultCount, 0) / recentPatterns.length;
  if (avgResultSize > 50) {
    session.userPreferences.preferredDataSize = 'comprehensive';
  } else if (avgResultSize > 10) {
    session.userPreferences.preferredDataSize = 'detailed';
  } else {
    session.userPreferences.preferredDataSize = 'summary';
  }
  
  // Learn common intent patterns
  const intentCounts = recentPatterns.reduce((acc, p) => {
    acc[p.intent] = (acc[p.intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostCommonIntent = Object.entries(intentCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'search';
  
  session.userPreferences.lastQueryIntent = mostCommonIntent;
  
  // Learn query style based on intents
  const guidanceQueries = recentPatterns.filter(p => p.intent === 'guidance').length;
  if (guidanceQueries > recentPatterns.length * 0.5) {
    session.userPreferences.queryStyle = 'guidance';
  } else if (recentPatterns.some(p => p.intent === 'analyze' || p.intent === 'compare')) {
    session.userPreferences.queryStyle = 'technical';
  } else {
    session.userPreferences.queryStyle = 'conversational';
  }
  
  // Learn common filters
  const agencies = recentPatterns
    .map(p => p.filters.agency)
    .filter(Boolean);
  
  const years = recentPatterns
    .map(p => p.filters.year)
    .filter(Boolean);
  
  const equipmentTypes = recentPatterns
    .map(p => p.equipmentType)
    .filter(Boolean);
  
  if (agencies.length > 0) {
    session.userPreferences.commonFilters.favoriteAgencies = [...new Set(agencies)];
  }
  
  if (years.length > 0) {
    session.userPreferences.commonFilters.preferredYears = [...new Set(years)];
  }
  
  if (equipmentTypes.length > 0) {
    session.userPreferences.commonFilters.frequentEquipment = [...new Set(equipmentTypes)];
  }
  
  console.log(`🎯 Learned preferences for session: expertise=${session.userPreferences.expertiseLevel}, style=${session.userPreferences.queryStyle}`);
}

/* ────────────────────── User Preferences Management ─────────────────── */

/**
 * Update user preferences explicitly
 */
export function updateUserPreferences(
  sessionId: string,
  preferences: Partial<UserPreferences>
): void {
  const session = initializeSession(sessionId);
  
  session.userPreferences = {
    ...session.userPreferences,
    ...preferences
  };
  
  session.lastUpdated = Date.now();
  
  console.log(`⚙️ Updated preferences for session ${sessionId}:`, preferences);
}

/**
 * Get user preferences with smart defaults
 */
export function getUserPreferences(sessionId: string): UserPreferences {
  const session = conversations[sessionId];
  if (!session) {
    return {
      preferredDataSize: 'summary',
      commonFilters: {},
      queryStyle: 'conversational',
      lastQueryIntent: 'search',
      responseFormat: 'narrative',
      expertiseLevel: 'intermediate'
    };
  }
  
  return session.userPreferences;
}

/* ────────────────────── Context Building ─────────────────── */

/**
 * Get formatted conversation context for AI prompts
 */
export function getConversationContext(sessionId: string, maxMessages = 6): string {
  const session = conversations[sessionId];
  if (!session || session.messages.length === 0) {
    return '';
  }
  
  const recentMessages = session.messages
    .slice(-maxMessages)
    .map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      const metadata = msg.metadata ? 
        ` [${msg.metadata.intent || 'unknown'}, ${msg.metadata.resultCount || 0} results${msg.metadata.equipmentType ? ', ' + msg.metadata.equipmentType : ''}]` : '';
      return `${role}: ${msg.content}${metadata}`;
    })
    .join('\n\n');
  
  const contextInfo = buildContextualInfo(session);
  
  return `CONVERSATION HISTORY:
${recentMessages}

SESSION CONTEXT:
${contextInfo}

`;
}

/**
 * Build contextual information about the session
 */
function buildContextualInfo(session: EnhancedConversation): string {
  const { sessionContext, userPreferences, totalQueries, successfulQueries } = session;
  
  const successRate = totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0;
  
  const info = [
    `Session Duration: ${Math.round((Date.now() - session.sessionStarted) / (1000 * 60))} minutes`,
    `Total Queries: ${totalQueries} (${successRate}% successful)`,
    `Expertise Level: ${userPreferences.expertiseLevel}`,
    `Query Style: ${userPreferences.queryStyle}`,
    `Preferred Data Size: ${userPreferences.preferredDataSize}`
  ];
  
  if (sessionContext.currentFocus) {
    const focus = sessionContext.currentFocus;
    const focusItems = [
      focus.agency ? `Agency: ${focus.agency}` : null,
      focus.year ? `Year: FY${focus.year}` : null,
      focus.location ? `Location: ${focus.location}` : null,
      focus.member ? `Member: ${focus.member}` : null,
      focus.equipmentType ? `Equipment: ${focus.equipmentType}` : null
    ].filter(Boolean);
    
    if (focusItems.length > 0) {
      info.push(`Current Focus: ${focusItems.join(', ')}`);
    }
  }
  
  if (sessionContext.sessionGoals.length > 0) {
    info.push(`Session Goals: ${sessionContext.sessionGoals.join(', ')}`);
  }
  
  if (sessionContext.topicProgression.length > 0) {
    info.push(`Topics Explored: ${sessionContext.topicProgression.slice(-3).join(' → ')}`);
  }
  
  if (sessionContext.lastSuccessfulQuery) {
    info.push(`Last Successful Query: "${sessionContext.lastSuccessfulQuery}"`);
  }
  
  return info.join('\n');
}

/**
 * Get query context for enhanced entity extraction
 */
export function getQueryContext(sessionId: string): any {
  const session = conversations[sessionId];
  if (!session) return {};
  
  const { sessionContext, userPreferences, queryPatterns } = session;
  
  // Get recent successful query patterns
  const successfulPatterns = queryPatterns
    .filter(p => p.success)
    .slice(-5);
  
  return {
    currentFocus: sessionContext.currentFocus,
    preferredFilters: userPreferences.commonFilters,
    recentSuccessfulQueries: successfulPatterns.map(p => ({
      query: p.query,
      filters: p.filters,
      intent: p.intent,
      equipmentType: p.equipmentType
    })),
    expertiseLevel: userPreferences.expertiseLevel,
    queryStyle: userPreferences.queryStyle,
    sessionGoals: sessionContext.sessionGoals,
    topicProgression: sessionContext.topicProgression
  };
}

/**
 * Update session focus based on query results
 */
export function updateSessionFocus(
  sessionId: string,
  filters: {
    agency?: string;
    year?: number;
    location?: string;
    member?: string;
    equipmentType?: string;
  }
): void {
  const session = initializeSession(sessionId);
  
  // Update current focus with non-null values
  session.sessionContext.currentFocus = {
    ...session.sessionContext.currentFocus,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== null && value !== undefined)
    )
  };
  
  session.lastUpdated = Date.now();
  
  console.log(`🎯 Updated session focus for ${sessionId}:`, session.sessionContext.currentFocus);
}

/**
 * Generate contextual suggestions based on session
 */
export function getContextualSuggestions(sessionId: string): string[] {
  const session = conversations[sessionId];
  if (!session) return [];
  
  const suggestions: string[] = [];
  const { sessionContext, userPreferences, queryPatterns } = session;
  
  // Based on session goals
  if (sessionContext.sessionGoals.includes('Equipment Funding Research')) {
    suggestions.push('Show me similar medical equipment earmarks');
    suggestions.push('Compare equipment costs across different agencies');
  }
  
  // Based on current focus
  if (sessionContext.currentFocus?.agency) {
    suggestions.push(`Show trends for ${sessionContext.currentFocus.agency} over time`);
    suggestions.push(`Compare ${sessionContext.currentFocus.agency} with similar agencies`);
  }
  
  if (sessionContext.currentFocus?.equipmentType) {
    suggestions.push(`Find more ${sessionContext.currentFocus.equipmentType} examples`);
    suggestions.push(`What's the typical cost range for this equipment?`);
  }
  
  // Based on expertise level
  if (userPreferences.expertiseLevel === 'beginner') {
    suggestions.push('How does the federal earmark process work?');
    suggestions.push('What are the most common funding agencies?');
  } else if (userPreferences.expertiseLevel === 'expert') {
    suggestions.push('Analyze appropriations patterns by subcommittee');
    suggestions.push('Show correlation between member seniority and earmark success');
  }
  
  // Based on recent unsuccessful queries
  const recentFailures = queryPatterns.slice(-3).filter(p => !p.success);
  if (recentFailures.length > 1) {
    suggestions.push('Try a broader search with fewer filters');
    suggestions.push('Show me general examples in this category');
  }
  
  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

/* ────────────────────── Conversation Management ─────────────────── */

/**
 * Get complete conversation for session
 */
export function getConversation(sessionId: string): EnhancedConversation {
  return conversations[sessionId] || initializeSession(sessionId);
}

/**
 * Clear conversation history but preserve learned preferences
 */
export function clearConversation(sessionId: string): void {
  const session = conversations[sessionId];
  if (session) {
    // Preserve learned preferences and patterns
    const preservedPreferences = { ...session.userPreferences };
    const preservedPatterns = session.queryPatterns.slice(-5); // Keep recent patterns
    
    conversations[sessionId] = {
      messages: [],
      queryPatterns: preservedPatterns,
      userPreferences: preservedPreferences,
      sessionContext: {
        querySequence: [],
        topicProgression: [],
        sessionGoals: []
      },
      lastUpdated: Date.now(),
      sessionStarted: Date.now(),
      totalQueries: 0,
      successfulQueries: 0
    };
    
    console.log(`🧹 Cleared conversation for session ${sessionId} (preserved preferences)`);
  }
}

/**
 * Get conversation analytics for debugging
 */
export function getConversationAnalytics(sessionId: string): any {
  const session = conversations[sessionId];
  if (!session) return null;
  
  const successRate = session.totalQueries > 0 ? (session.successfulQueries / session.totalQueries * 100).toFixed(1) : '0';
  
  const intentDistribution = session.queryPatterns.reduce((acc, p) => {
    acc[p.intent] = (acc[p.intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    sessionId,
    duration: Math.round((Date.now() - session.sessionStarted) / (1000 * 60)),
    totalMessages: session.messages.length,
    totalQueries: session.totalQueries,
    successfulQueries: session.successfulQueries,
    successRate: `${successRate}%`,
    intentDistribution,
    expertiseLevel: session.userPreferences.expertiseLevel,
    queryStyle: session.userPreferences.queryStyle,
    topicsExplored: session.sessionContext.topicProgression,
    sessionGoals: session.sessionContext.sessionGoals,
    preferences: session.userPreferences
  };
}