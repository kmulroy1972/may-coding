import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { supabase } from '@/lib/supabase';
import type { Earmark } from 'types/database.types';
import { 
  addMessage, 
  getConversationContext, 
  updateUserPreferences,
  getQueryContext,
  addQueryPattern,
  updateSessionFocus,
  getContextualSuggestions
} from '@/lib/conversationMemory';

/* ───────────────────────────── AI Configuration ───────────────────────────── */
const llm = new ChatOpenAI({
  modelName: 'gpt-4-turbo',
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.2
});

/* ────────────────────── Domain Knowledge ─────────────────── */
const DOMAIN_KNOWLEDGE = {
  agencies: new Map([
    ['labor', 'Department of Labor'],
    ['dol', 'Department of Labor'],
    ['hud', 'Department of Housing and Urban Development'],
    ['housing', 'Department of Housing and Urban Development'],
    ['treasury', 'Department of the Treasury'],
    ['education', 'Department of Education'],
    ['ed', 'Department of Education'],
    ['transportation', 'Department of Transportation'],
    ['dot', 'Department of Transportation'],
    ['hhs', 'Department of Health and Human Services'],
    ['health', 'Department of Health and Human Services'],
    ['defense', 'Department of Defense'],
    ['dod', 'Department of Defense'],
    ['agriculture', 'Department of Agriculture'],
    ['usda', 'Department of Agriculture'],
    ['interior', 'Department of the Interior'],
    ['energy', 'Department of Energy'],
    ['commerce', 'Department of Commerce'],
    ['justice', 'Department of Justice'],
    ['doj', 'Department of Justice'],
    ['veterans', 'Department of Veterans Affairs'],
    ['va', 'Department of Veterans Affairs'],
    ['homeland', 'Department of Homeland Security'],
    ['dhs', 'Department of Homeland Security']
  ]),

  medicalEquipment: new Map([
    ['mri', 'Medical Research Infrastructure'],
    ['ct scan', 'Medical Equipment'],
    ['x-ray', 'Medical Equipment'],
    ['ultrasound', 'Medical Equipment'],
    ['dialysis', 'Medical Equipment'],
    ['ventilator', 'Medical Equipment'],
    ['hospital equipment', 'Medical Infrastructure'],
    ['medical device', 'Medical Equipment'],
    ['laboratory equipment', 'Medical Research'],
    ['imaging equipment', 'Medical Infrastructure']
  ])
};

const STATE_MAPPING = new Map([
  ['alabama', 'AL'], ['alaska', 'AK'], ['arizona', 'AZ'], ['arkansas', 'AR'],
  ['california', 'CA'], ['colorado', 'CO'], ['connecticut', 'CT'], ['delaware', 'DE'],
  ['florida', 'FL'], ['georgia', 'GA'], ['hawaii', 'HI'], ['idaho', 'ID'],
  ['illinois', 'IL'], ['indiana', 'IN'], ['iowa', 'IA'], ['kansas', 'KS'],
  ['kentucky', 'KY'], ['louisiana', 'LA'], ['maine', 'ME'], ['maryland', 'MD'],
  ['massachusetts', 'MA'], ['michigan', 'MI'], ['minnesota', 'MN'], ['mississippi', 'MS'],
  ['missouri', 'MO'], ['montana', 'MT'], ['nebraska', 'NE'], ['nevada', 'NV'],
  ['new hampshire', 'NH'], ['new jersey', 'NJ'], ['new mexico', 'NM'], ['new york', 'NY'],
  ['north carolina', 'NC'], ['north dakota', 'ND'], ['ohio', 'OH'], ['oklahoma', 'OK'],
  ['oregon', 'OR'], ['pennsylvania', 'PA'], ['rhode island', 'RI'], ['south carolina', 'SC'],
  ['south dakota', 'SD'], ['tennessee', 'TN'], ['texas', 'TX'], ['utah', 'UT'],
  ['vermont', 'VT'], ['virginia', 'VA'], ['washington', 'WA'], ['west virginia', 'WV'],
  ['wisconsin', 'WI'], ['wyoming', 'WY'], ['district of columbia', 'DC']
]);

/* ────────────────────── Enhanced Entity Extraction ─────────────────── */
interface ExtractedEntities {
  member: string | null;
  year: number | null;
  agency: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  location: string | null;
  keywords: string[];
  intent: 'search' | 'list' | 'analyze' | 'compare' | 'summarize' | 'guidance';
  confidence: number;
  equipmentType?: string | null;
}

function getStateCode(stateName: string): string | null {
  if (/^[A-Za-z]{2}$/.test(stateName)) {
    return stateName.toUpperCase();
  }
  const normalized = stateName.toLowerCase().trim();
  return STATE_MAPPING.get(normalized) || null;
}

function parseAmount(amountText: string): number {
  const cleaned = amountText.replace(/[,$]/g, '');
  const num = parseFloat(cleaned);
  
  if (/m(illion)?/i.test(amountText)) return num * 1_000_000;
  if (/b(illion)?/i.test(amountText)) return num * 1_000_000_000;
  if (/k/i.test(amountText)) return num * 1_000;
  
  return num;
}

function classifyIntent(question: string): 'search' | 'list' | 'analyze' | 'compare' | 'summarize' | 'guidance' {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes('compare') || lowerQ.includes('versus') || lowerQ.includes('vs')) return 'compare';
  if (lowerQ.includes('analyze') || lowerQ.includes('analysis') || lowerQ.includes('trend')) return 'analyze';
  if (lowerQ.includes('summary') || lowerQ.includes('summarize') || lowerQ.includes('overview')) return 'summarize';
  if (lowerQ.includes('list') || lowerQ.includes('show all') || lowerQ.includes('all earmarks')) return 'list';
  if (lowerQ.includes('best') || lowerQ.includes('should') || lowerQ.includes('recommend') || 
      lowerQ.includes('guidance') || lowerQ.includes('how to') || lowerQ.includes('what account')) return 'guidance';
  
  return 'search';
}

function enhancedEntityExtraction(question: string, conversationContext: any = {}): ExtractedEntities {
  console.log('🔍 Enhanced entity extraction for:', question);
  
  const lowerQ = question.toLowerCase();
  let confidence = 0.5;
  
  const intent = classifyIntent(question);
  
  // Use conversation context to enhance extraction
  let member: string | null = null;
  let agency: string | null = null;
  let equipmentType: string | null = null;
  let year: number | null = null;
  let location: string | null = null;
  
  // Check conversation context for hints
  if (conversationContext.currentFocus) {
    const focus = conversationContext.currentFocus;
    if (!agency && focus.agency) {
      agency = focus.agency;
      confidence += 0.1;
    }
    if (!equipmentType && focus.equipmentType) {
      equipmentType = focus.equipmentType;
      confidence += 0.1;
    }
    if (!year && focus.year) {
      year = focus.year;
      confidence += 0.1;
    }
    if (!location && focus.location) {
      location = focus.location;
      confidence += 0.1;
    }
  }
  
  // Member extraction
  const memberMatch = question.match(/\b(?:Sen(?:ator)?|Rep(?:resentative)?|Congress(?:man|woman)?)\.?\s+([\w'-]+(?:\s+[\w'-]+)*)\b/gi);
  if (memberMatch && memberMatch[1]) {
    member = memberMatch[1].trim();
    confidence += 0.2;
  }
  
  // Year extraction
  const yearMatch = question.match(/\b(?:FY\s*)?(?:20)?(2[2-4])\b/i);
  if (yearMatch) {
    year = 2000 + parseInt(yearMatch[1]);
    confidence += 0.2;
  }
  
  // Agency extraction
  for (const [key, fullName] of DOMAIN_KNOWLEDGE.agencies) {
    if (lowerQ.includes(key)) {
      agency = fullName.replace('Department of ', '');
      confidence += 0.2;
      break;
    }
  }
  
  // Equipment type detection
  for (const [key, type] of DOMAIN_KNOWLEDGE.medicalEquipment) {
    if (lowerQ.includes(key)) {
      equipmentType = type;
      confidence += 0.15;
      break;
    }
  }
  
  // Amount extraction
  let minAmount: number | null = null;
  let maxAmount: number | null = null;
  
  const overMatch = question.match(/(?:over|above|greater than|more than)\s+\$?([\d.,]+\s*(?:[kmb](?:illion|million)?)?)/gi);
  const underMatch = question.match(/(?:under|below|less than|fewer than)\s+\$?([\d.,]+\s*(?:[kmb](?:illion|million)?)?)/gi);
  
  if (overMatch) {
    minAmount = parseAmount(overMatch[1]);
    confidence += 0.15;
  }
  if (underMatch) {
    maxAmount = parseAmount(underMatch[1]);
    confidence += 0.15;
  }
  
  // Location extraction
  if (!location) {
    const locationPatterns = [
      /\bin\s+([A-Za-z][A-Za-z\s]+?)(?:\s+(?:state|projects?|earmarks?|funding)|$)/gi,
      /\bfor\s+([A-Za-z][A-Za-z\s]+?)(?:\s+(?:projects?|earmarks?|funding)|$)/gi
    ];
    
    for (const pattern of locationPatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        const stateCode = getStateCode(match[1].trim());
        if (stateCode) {
          location = stateCode;
          confidence += 0.2;
          break;
        }
      }
    }
  }
  
  // Keywords
  const stopWords = new Set([
    'projects', 'earmarks', 'funding', 'department', 'show', 'me', 'list', 'all', 
    'what', 'best', 'should', 'account', 'request', 'for', 'the', 'and', 'of'
  ]);
  
  const keywords = question
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^\w]/g, ''))
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);
  
  console.log('✓ Enhanced extraction results:', {
    member, year, agency, minAmount, maxAmount, location, keywords, intent, confidence, equipmentType
  });
  
  return {
    member,
    year,
    agency,
    minAmount,
    maxAmount,
    location,
    keywords,
    intent,
    confidence: Math.min(confidence, 1.0),
    equipmentType
  };
}

/* ────────────────────── Query Builder ─────────────────── */
async function queryEarmarks(filters: ExtractedEntities): Promise<Earmark[]> {
  console.log('🔍 Building query with filters:', filters);
  
  let query = supabase.from('earmarks').select('*');
  
  if (filters.member) {
    const memberLastName = filters.member.split(' ').pop() || filters.member;
    query = query.ilike('member', `%${memberLastName}%`);
  }
  
  if (filters.year) {
    query = query.eq('year', filters.year);
  }
  
  if (filters.agency) {
    const agencyName = `Department of ${filters.agency}`;
    query = query.eq('agency', agencyName);
  }
  
  if (filters.minAmount) {
    query = query.gte('amount', filters.minAmount);
  }
  
  if (filters.maxAmount) {
    query = query.lte('amount', filters.maxAmount);
  }
  
  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }
  
  if (filters.keywords.length > 0) {
    const keywordConditions = [];
    for (const keyword of filters.keywords) {
      keywordConditions.push(
        `recipient.ilike.%${keyword}%`,
        `subcommittee.ilike.%${keyword}%`,
        `account.ilike.%${keyword}%`,
        `budget_function.ilike.%${keyword}%`
      );
    }
    query = query.or(keywordConditions.join(','));
  }
  
  query = query.order('amount', { ascending: false }).limit(50);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Query error:', error);
    throw new Error(error.message);
  }
  
  console.log(`✓ Query returned ${data?.length || 0} results`);
  return data || [];
}

/* ────────────────────── Guidance System ─────────────────── */
function generateFundingGuidance(question: string, filters: ExtractedEntities): string {
  const lowerQ = question.toLowerCase();
  
  if (lowerQ.includes('mri') || (lowerQ.includes('hospital') && lowerQ.includes('equipment'))) {
    return `
**FUNDING GUIDANCE FOR HOSPITAL MRI EQUIPMENT:**

**🎯 Best Federal Accounts for MRI Machine Funding:**

**1. Department of Health and Human Services (HHS)**
   - **Account:** "Health Resources and Services Administration (HRSA)"
   - **Why:** Primary agency for healthcare infrastructure and community health centers
   - **Typical Range:** $500K - $3M per project
   - **Best For:** Community hospitals, rural healthcare facilities

**2. Department of Veterans Affairs (VA)**
   - **Account:** "Medical Facilities Construction"
   - **Why:** If serving veterans or in partnership with VA medical centers
   - **Typical Range:** $1M - $5M per project
   - **Best For:** Hospitals with veteran patient populations

**3. Department of Defense (DOD)**
   - **Account:** "Defense Health Program" 
   - **Why:** Military hospitals or facilities serving military families
   - **Typical Range:** $2M - $10M per project
   - **Best For:** Military treatment facilities, contractor hospitals

**💰 Typical MRI Equipment Costs:**
- **Basic 1.5T MRI:** $1M - $1.5M
- **Advanced 3T MRI:** $2M - $3M  
- **Installation/Site Prep:** $200K - $500K
- **Annual Maintenance:** $100K - $200K

**📋 Key Application Requirements:**
- ✅ Demonstrate clear community medical need
- ✅ Show hospital's financial contribution (typically 20-50% cost-sharing)
- ✅ Provide detailed technical specifications and vendor quotes
- ✅ Include 5-year operational and maintenance plan
- ✅ Document physician staff training requirements
- ✅ Show community and medical staff support letters

**📅 Application Process:**
- **When to Apply:** March - May during appropriations cycle
- **Who to Contact:** Your Congressional Representative and both Senators
- **Timeline:** 12-18 months from application to funding
- **Success Rate:** ~15-25% for well-documented requests

**💡 Pro Tips:**
- Partner with medical schools or research institutions if possible
- Emphasize underserved population benefits
- Include economic impact data (jobs created, patients served)
- Show how this fills a regional healthcare gap

Would you like me to search for similar MRI funding examples in our earmark database?
`;
  }

  return `
**GENERAL FEDERAL FUNDING GUIDANCE:**

**🎯 Common Funding Sources:**
1. **Department of Health and Human Services** - Healthcare projects
2. **Department of Education** - Educational institutions  
3. **Department of Transportation** - Infrastructure projects
4. **Department of Agriculture** - Rural community projects

**📋 Application Process:**
- Contact your Congressional representatives
- Submit during appropriations windows (March-May)
- Provide detailed project justification and budget
- Show community support and demonstrated need

Would you like me to search for similar projects in the earmark database?
`;
}

/* ────────────────────── Enhanced Context Builder ─────────────────── */
function buildEnhancedContext(
  question: string, 
  filters: ExtractedEntities, 
  earmarks: Earmark[], 
  conversationContext: string,
  sessionId: string
): string {
  
  if (filters.intent === 'guidance') {
    const guidance = generateFundingGuidance(question, filters);
    
    return `
You are Mosaic's AI assistant for federal earmark analysis and funding guidance.

${conversationContext}

USER QUERY: "${question}"
QUERY TYPE: Funding Guidance Request
DETECTED EQUIPMENT: ${filters.equipmentType || 'General'}

PROVIDE THIS GUIDANCE:
${guidance}

CONTEXTUAL ENHANCEMENT:
- Adapt your tone to the user's expertise level shown in session context
- Reference previous related queries if relevant
- Suggest logical follow-up questions based on session goals

INSTRUCTIONS:
1. Present the funding guidance clearly and professionally
2. Use the exact formatting and information provided above
3. Offer to search for similar examples if helpful
4. Be encouraging and specific about next steps
5. Provide 2-3 relevant follow-up suggestions at the end
`;
  }
  
  // Regular earmark analysis with enhanced context
  let analysisContext = '';
  if (earmarks.length > 0) {
    const total = earmarks.reduce((sum, e) => sum + e.amount, 0);
    const avgAmount = total / earmarks.length;
    
    analysisContext = `
ANALYSIS CONTEXT:
- Total Records: ${earmarks.length}
- Total Funding: $${(total / 1_000_000).toFixed(1)}M
- Average Amount: $${(avgAmount / 1_000_000).toFixed(1)}M
`;
  }
  
  const recordsToShow = Math.min(earmarks.length, 5);
  const sampleRecords = earmarks.slice(0, recordsToShow).map((e, i) => {
    const amount = e.amount >= 1_000_000 ? `$${(e.amount / 1_000_000).toFixed(1)}M` : `$${(e.amount / 1_000).toFixed(0)}K`;
    return `${i + 1}. **${e.recipient}**
   Amount: ${amount} | Year: FY${e.year} | Location: ${e.location || 'N/A'}
   Agency: ${e.agency}`;
  }).join('\n\n');
  
  return `
You are Mosaic's AI assistant for federal earmark analysis.

${conversationContext}

USER QUERY: "${question}"
INTENT: ${filters.intent}
CONFIDENCE: ${(filters.confidence * 100).toFixed(0)}%

${analysisContext}

${earmarks.length > 0 ? `
SAMPLE RECORDS (showing ${recordsToShow} of ${earmarks.length}):
${sampleRecords}
` : 'No matching records found.'}

CONTEXTUAL ENHANCEMENT:
- Consider the user's session goals and topic progression
- Build on previous successful queries
- Adapt complexity to user's demonstrated expertise level
- Reference relevant patterns from conversation history

INSTRUCTIONS:
1. Provide clear, helpful analysis of the earmark data
2. Format dollar amounts consistently  
3. Be direct and informative
4. Build naturally on the conversation context
5. Suggest 2-3 relevant follow-up queries at the end
`;
}

/* ────────────────────── API Handler ─────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || `session-${Date.now()}`;
    
    // Extract question
    let question = '';
    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      const lastMsg = body.messages[body.messages.length - 1];
      question = lastMsg.text || lastMsg.content || '';
    } else {
      question = (body.question ?? '').trim();
    }
    
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }
    
    console.log(`🚀 Processing query for session ${sessionId}: "${question}"`);
    
    // Add user message to conversation
    addMessage(sessionId, 'user', question);
    
    // Get enhanced conversation context
    const conversationContext = getConversationContext(sessionId);
    const queryContext = getQueryContext(sessionId);
    
    // Enhanced entity extraction with conversation context
    const filters = enhancedEntityExtraction(question, queryContext);
    console.log('🎯 Enhanced extraction with context:', filters);
    
    // Query earmarks (skip for pure guidance queries)
    let earmarks: Earmark[] = [];
    if (filters.intent !== 'guidance' || question.toLowerCase().includes('example')) {
      earmarks = await queryEarmarks(filters);
    }
    
    console.log(`📊 Found ${earmarks.length} results`);
    
    // Add query pattern for learning
    addQueryPattern(sessionId, {
      query: question,
      filters,
      resultCount: earmarks.length,
      intent: filters.intent,
      equipmentType: filters.equipmentType
    });
    
    // Update session focus
    updateSessionFocus(sessionId, {
      agency: filters.agency,
      year: filters.year,
      location: filters.location,
      member: filters.member,
      equipmentType: filters.equipmentType
    });
    
    // Build enhanced context
    const context = buildEnhancedContext(
      question, 
      filters, 
      earmarks, 
      conversationContext,
      sessionId
    );
    
    // Get AI response
    const promptTemplate = PromptTemplate.fromTemplate(`{context}`);
    const formattedPrompt = await promptTemplate.format({ context });
    const result = await llm.invoke(formattedPrompt);
    
    const aiResponse = result.content.toString();
    
    // Add AI response to conversation with metadata
    addMessage(sessionId, 'assistant', aiResponse, {
      intent: filters.intent,
      resultCount: earmarks.length,
      confidence: filters.confidence,
      equipmentType: filters.equipmentType
    });
    
    // Update user preferences based on interaction
    updateUserPreferences(sessionId, {
      preferredDataSize: earmarks.length > 20 ? 'detailed' : 'summary',
      lastQueryIntent: filters.intent
    });
    
    // Get contextual suggestions
    const suggestions = getContextualSuggestions(sessionId);
    
    // Prepare enhanced response
    const response = {
      answer: aiResponse,
      data: earmarks.slice(0, 20),
      count: earmarks.length,
      sessionId,
      queryInfo: {
        intent: filters.intent,
        confidence: filters.confidence,
        equipmentType: filters.equipmentType
      },
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      contextualInfo: {
        sessionFocus: queryContext.currentFocus,
        sessionGoals: queryContext.sessionGoals,
        expertiseLevel: queryContext.expertiseLevel
      }
    };
    
    console.log(`✅ Enhanced response generated for session ${sessionId}`);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}