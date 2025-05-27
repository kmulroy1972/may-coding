import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { supabase } from '@/lib/supabase';
import type { Earmark } from 'types/database.types';
// Fix import path
import { addMessage, getConversationContext } from '@/lib/conversationMemory';
import OpenAI from 'openai';

/* ───────────────────────────── OpenAI ───────────────────────────── */
const llm = new ChatOpenAI({
  modelName: 'gpt-4-turbo', // Using the latest available model for better capabilities
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7 // Add some creativity but not too much
});

// Initialize OpenAI client for file search
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ────────────────────── helpers & regex section ─────────────────── */
// State name to postal code mapping
function getStateCode(stateName: string): string | null {
  const stateMap: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
    'puerto rico': 'PR', 'guam': 'GU', 'american samoa': 'AS',
    'virgin islands': 'VI', 'northern mariana islands': 'MP'
  };

  // Handle abbreviations
  if (/^[A-Za-z]{2}$/.test(stateName)) {
    return stateName.toUpperCase();
  }

  // Handle full state names
  const normalizedName = stateName.toLowerCase().trim();
  return stateMap[normalizedName] || null;
}

function dollars(raw: string): number {
  // "5,000", "2.5", "3m", "3 million" → dollars
  const n = parseFloat(raw.replace(/,/g, ''));
  return /m(illion)?/i.test(raw) ? n * 1_000_000 : n;
}

function extractEntities(question: string) {
  // Try multiple patterns to extract member names
  let memberMatch = question.match(
    /\b(?:Sen(?:ator)?|Rep(?:resentative)?|Congress(?:man|woman)?)\.?\s+([\w'-]+(?:\s+[\w'-]+)?)\b/i
  );
  
  // If that doesn't work, try just looking for common surnames after these titles
  if (!memberMatch || memberMatch[1].includes('secured') || memberMatch[1].includes('requested')) {
    memberMatch = question.match(/\b(?:Sen(?:ator)?|Rep(?:resentative)?)\.?\s+([\w'-]+)\b/i);
  }
  const yearMatch   = question.match(/\b(?:FY\s*)?(20\d{2})\b/i);
  const agencyMatch = question.match(
    /\b(?:U\.?S\.?\s+)?(?:Department|Dept\.?)\s+of\s+([\w\s&]+?)(?:\s+in\s+|\s+for\s+|\s*$)/i
  );

  const overMatch  = question.match(/(?:over|above|greater than)\s+\$?([\d.,]+\s*(?:m(?:illion)?)?)/i);
  const underMatch = question.match(/(?:under|below|less than)\s+\$?([\d.,]+\s*(?:m(?:illion)?)?)/i);

  // Enhanced location patterns - more comprehensive
  const locationPatterns = [
    /\bin\s+([A-Za-z][A-Za-z\s]+?)(?:\b|$)/i,                 // "in California"
    /\bfor\s+([A-Za-z][A-Za-z\s]+?)(?:\b|$)/i,                // "for Texas"
    /\b((?:New\s+)?[A-Za-z]+(?:\s+[A-Za-z]+)?)\s+projects\b/i, // "New Jersey projects"
    /\bfunded\s+in\s+([A-Za-z][A-Za-z\s]+?)(?:\b|$)/i,        // "funded in Arizona"
    /\bprojects\s+in\s+([A-Za-z][A-Za-z\s]+?)(?:\b|$)/i,      // "projects in Oregon"
    /\b([A-Za-z][A-Za-z\s]+?)\s+earmarks\b/i,                 // "California earmarks"
    /\b([A-Za-z][A-Za-z\s]+?)\s+funding\b/i,                  // "Texas funding"
    /\b([A-Za-z][A-Za-z\s]+?)\s+allocations\b/i               // "Ohio allocations"
  ];

  let locationMatch = null;
  let locationText = null;

  // Try each pattern until we get a match
  for (const pattern of locationPatterns) {
    locationMatch = question.match(pattern);
    if (locationMatch) {
      locationText = locationMatch[1].trim();
      break;
    }
  }
  
  // Get location code if we have a match
  const locationCode = locationText ? getStateCode(locationText) : null;

  const member = memberMatch ? memberMatch[1].trim() : null;
  const year   = yearMatch   ? parseInt(yearMatch[1], 10) : null;
  const agency = agencyMatch ? agencyMatch[1].trim() : null;

  const minAmount = overMatch  ? dollars(overMatch[1])  : null;
  const maxAmount = underMatch ? dollars(underMatch[1]) : null;

  /* crude keyword extraction */
  const strip = (s: string | undefined | null) => (s ? question.replace(s, '') : question);
  let cleaned = strip(memberMatch?.[0]);
  cleaned     = strip(yearMatch?.[0]);
  cleaned     = strip(agencyMatch?.[0]);
  cleaned     = strip(overMatch?.[0]);
  cleaned     = strip(underMatch?.[0]);
  cleaned     = strip(locationMatch?.[0]);

  const stop = new Set(['projects','earmarks','funding','funded','department',
                        'earmark','of','the','and','in','for','on','senator','representative',
                        'secured','requested','congress','congressman','congresswoman']);
  
  // Also exclude the member name from keywords if we found one
  const memberName = member ? member.toLowerCase() : '';
  
  const keywords = cleaned
    .split(/\s+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 3 && !stop.has(w) && w !== memberName);

  // Handle common agency abbreviations and aliases
  const agencyAliases: Record<string, string> = {
    'labor': 'Labor',
    'hud': 'Housing and Urban Development',
    'treasury': 'Treasury',
    'education': 'Education',
    'transportation': 'Transportation',
    'dot': 'Transportation',
    'hhs': 'Health and Human Services',
    'health': 'Health and Human Services',
    'defense': 'Defense',
    'dod': 'Defense',
    'agriculture': 'Agriculture',
    'usda': 'Agriculture',
    'interior': 'Interior',
    'energy': 'Energy',
    'commerce': 'Commerce',
    'justice': 'Justice',
    'doj': 'Justice',
    'epa': 'Environmental Protection',
    'environmental': 'Environmental Protection',
    'veterans': 'Veterans Affairs',
    'va': 'Veterans Affairs'
  };

  // Check for agency aliases in the question
  if (!agency) {
    for (const [alias, fullName] of Object.entries(agencyAliases)) {
      if (question.toLowerCase().includes(alias)) {
        return { member, year, agency: fullName, minAmount, maxAmount, keywords, location: locationCode };
      }
    }
  }

  return { member, year, agency, minAmount, maxAmount, keywords, location: locationCode };
}

function fmt(n: number) {
  return n >= 1_000_000
    ? '$' + (n / 1_000_000).toFixed(1) + ' m'
    : '$' + n.toLocaleString();
}

/* ────────────────────── Supabase query helper ───────────────────── */
async function queryEarmarks(f: ReturnType<typeof extractEntities>): Promise<Earmark[]> {
  console.log('Starting query with filters:', JSON.stringify(f, null, 2));
  
  let q = supabase.from('earmarks').select('*');

  // Fix member search to handle the actual database format where multiple members are in one field
  if (f.member) {
    // Handle different name formats: "Menendez" should match "Senator Robert Menendez" 
    const memberLastName = f.member.split(' ').pop(); // Get last word as surname
    q = q.ilike('member', `%${memberLastName}%`);
  }

  if (f.year)       q = q.eq('year', f.year);
  
  // Fix agency search to handle "Department of" prefix
  if (f.agency)     q = q.eq('agency', `Department of ${f.agency}`);
  
  // Fix amount comparison
  if (f.minAmount)  q = q.gte('amount', f.minAmount);
  if (f.maxAmount)  q = q.lte('amount', f.maxAmount);
  
  // Fix location search
  if (f.location)   q = q.ilike('location', `%${f.location}%`);

  // Improve keyword search
  if (f.keywords.length) {
    const conditions = [];
    for (const keyword of f.keywords) {
      conditions.push(
        `recipient.ilike.%${keyword}%`,
        `subcommittee.ilike.%${keyword}%`,
        `account.ilike.%${keyword}%`,
        `location.ilike.%${keyword}%`,
        `budget_function.ilike.%${keyword}%`
      );
    }
    q = q.or(conditions.join(','));
  }

  // Log the query parameters
  console.log('Query Parameters:', {
    member: f.member ? `%${f.member}%` : null,
    year: f.year,
    agency: f.agency ? `Department of ${f.agency}` : null,
    minAmount: f.minAmount,
    maxAmount: f.maxAmount,
    location: f.location ? `%${f.location}%` : null,
    keywords: f.keywords.length ? f.keywords.join(' ') : null
  });

  // Add sorting and limit
  const { data, error } = await q
    .order('amount', { ascending: false })
    .limit(1000);
  
  console.log('DEBUG: Generated query data length:', data?.length);
  console.log('DEBUG: Query error:', error);
  
  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(error.message);
  }
  
  console.log('Query results:', data?.length || 0, 'records found');
  return data || [];
}

/**
 * Use AI to interpret natural language queries into database filters
 */
async function interpretQueryWithAI(question: string): Promise<ReturnType<typeof extractEntities> | null> {
  try {
    const interpretationPrompt = `
You are a query interpreter for a federal earmarks database. Convert this natural language question into database search parameters.

The database has these fields:
- member: Congressional member names (stored as "Senator X" or "Rep. Y")
- year: Fiscal year (2022, 2023, 2024)
- agency: Department names (stored as "Department of X")
- amount: Dollar amounts
- location: State codes
- recipient: Project recipient and description

Question: "${question}"

Extract ONLY the specific search parameters. Ignore action words like "secured", "requested", "list", "show", "total", etc.

Respond with a JSON object with these fields (use null for empty):
{
  "member": "lastname only",
  "year": number or null,
  "agency": "department name without 'Department of'" or null,
  "minAmount": number or null,
  "maxAmount": number or null,
  "location": "state code" or null,
  "keywords": []
}

Examples:
- "Senator Smith's earmarks" → {"member": "Smith", "year": null, "agency": null, "minAmount": null, "maxAmount": null, "location": null, "keywords": []}
- "Transportation earmarks in 2023" → {"member": null, "year": 2023, "agency": "Transportation", "minAmount": null, "maxAmount": null, "location": null, "keywords": []}
`;

    const result = await llm.invoke(interpretationPrompt);
    const response = result.content.toString().trim();
    
    // Try to parse the JSON response
    const jsonMatch = response.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('AI interpretation successful:', parsed);
      return parsed;
    }
    
    console.log('AI interpretation failed to return valid JSON');
    return null;
    
  } catch (error) {
    console.error('AI interpretation error:', error);
    return null;
  }
}

/**
 * Retrieves relevant document content using OpenAI's File Search
 */
async function getRelevantDocumentContent(question: string): Promise<{
  content: string;
  citations: Array<{filename: string; fileId: string}>;
}> {
  const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;
  
  if (!vectorStoreId) {
    console.warn('OPENAI_VECTOR_STORE_ID not configured, skipping document search');
    return {
      content: `
DOCUMENT SEARCH: No vector store configured.

To enable document search:
1. Run: npm run setup-vector-store
2. Run: npm run upload-docs
3. Add OPENAI_VECTOR_STORE_ID to your .env.local file

Using fallback earmark information:
- Community Project Funding (CPF) in House, Congressionally Directed Spending (CDS) in Senate
- FY 2025-2026 Request window: Mar 25 - Apr 15 2025 (House)
- 15-project cap per Member, Non-profits ineligible for HUD-EDI account
- Defense, MilCon-VA, and THUD accounts restored after FY 2024 pause
`,
      citations: []
    };
  }

  try {
    console.log('🔍 Searching documents for:', question);
    
    // Use OpenAI's Responses API with file search
    const response = await openai.responses.create({
      model: "gpt-4o-mini", // Efficient model for document search
      input: `Find information relevant to this earmark/funding question: ${question}`,
      tools: [{
        type: "file_search",
        vector_store_ids: [vectorStoreId],
        max_num_results: 5 // Limit results for performance
      }],
      include: ["file_search_call.results"] // Include search results in response
    });

    // Extract content and citations from response
    let documentContent = '';
    const citations: Array<{filename: string; fileId: string}> = [];
    
    for (const output of response.output) {
      if (output.type === 'message' && output.content) {
        for (const contentItem of output.content) {
          if (contentItem.type === 'output_text') {
            documentContent += contentItem.text;
            
            // Extract citations from annotations
            if (contentItem.annotations) {
              for (const annotation of contentItem.annotations) {
                if (annotation.type === 'file_citation') {
                  // Handle file citation annotation
                  const fileCitation = annotation as {
                    type: 'file_citation';
                    filename?: string;
                    file_id?: string;
                  };
                  citations.push({
                    filename: fileCitation.filename || 'Unknown file',
                    fileId: fileCitation.file_id || 'unknown'
                  });
                }
              }
            }
          }
        }
      }
    }

    // Format the document content
    const formattedContent = documentContent ? `
DOCUMENT SEARCH RESULTS:

${documentContent}

${citations.length > 0 ? `
SOURCES:
${citations.map(c => `- ${c.filename}`).join('\n')}
` : ''}
` : `
DOCUMENT SEARCH: No relevant documents found for this query.

Consider uploading more documents related to:
- Appropriations committee guidelines
- Earmark process documentation
- Agency-specific funding rules
- Legislative procedures
`;

    console.log(`📄 Found ${citations.length} document citations`);
    
    return {
      content: formattedContent,
      citations
    };

  } catch (error) {
    console.error('Document search error:', error);
    
    return {
      content: `
DOCUMENT SEARCH ERROR: Unable to search documents at this time.

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Using fallback earmark information:
- Community Project Funding (CPF) in House, Congressionally Directed Spending (CDS) in Senate
- Members submit requests during specific windows (typically March-May)
- Each Member limited in number of requests (House: 15 per Member)
- No for-profit recipients allowed
- Requires documented community support and public disclosure
`,
      citations: []
    };
  }
}

/* Function to build context for OpenAI */
async function buildOpenAIContext(
  question: string, 
  filters: ReturnType<typeof extractEntities>, 
  earmarks: Earmark[],
  conversationContext: string = ''
): Promise<{
  context: string;
  citations: Array<{filename: string; fileId: string}>;
}> {
  // Create a summary of the filters applied
  const filterSummary = [
    filters.year ? `Year: ${filters.year}` : null,
    filters.agency ? `Agency: Department of ${filters.agency}` : null,
    filters.member ? `Member: ${filters.member}` : null,
    filters.minAmount ? `Minimum Amount: $${filters.minAmount.toLocaleString()}` : null,
    filters.maxAmount ? `Maximum Amount: $${filters.maxAmount.toLocaleString()}` : null,
    filters.location ? `Location: ${filters.location}` : null,
    filters.keywords.length ? `Keywords: ${filters.keywords.join(', ')}` : null
  ].filter((item): item is string => item !== null);  // Type guard to ensure string[]
  
  // Show sample records (more for "list all" queries, fewer for others)
  const isListAllQuery = question.toLowerCase().includes('all') || question.toLowerCase().includes('list');
  const recordsToShow = isListAllQuery ? Math.min(earmarks.length, 50) : 5;
  const sampleRecords = earmarks.slice(0, recordsToShow).map((e, i) => 
    `**${i+1}. ${e.recipient}**

**FY Year:** ${e.year}  
**Amount:** ${fmt(e.amount)}  
**Location:** ${e.location || 'N/A'}  
**Subcommittee:** ${e.subcommittee || 'N/A'}  
**Department:** ${e.agency}  
**Agency:** ${e.subunit || 'N/A'}  
**Account:** ${e.account || 'N/A'}  
**Member:** ${e.member || 'N/A'}  

---`
  ).join('\n\n');

  // Build statistics if we have results
  let stats = '';
  if (earmarks.length > 0) {
    const total = earmarks.reduce((sum, e) => sum + e.amount, 0);
    const avg = total / earmarks.length;
    const min = Math.min(...earmarks.map(e => e.amount));
    const max = Math.max(...earmarks.map(e => e.amount));
    
    stats = `
STATISTICS:
- Total amount: ${fmt(total)}
- Average amount: ${fmt(avg)}
- Smallest earmark: ${fmt(min)}
- Largest earmark: ${fmt(max)}
- Most common agency: ${getMostCommon(earmarks.map(e => e.agency))}
- Most common recipient type: ${getMostCommon(earmarks.map(e => e.budget_function).filter((f): f is string => Boolean(f)))}`;
  }

  // Get relevant document content using file search
  const documentSearch = await getRelevantDocumentContent(question);

  // Streamlined context - only include relevant details
  const earmarkReference = `
SYSTEM CONTEXT: You are Mosaic's AI assistant for analyzing federal earmark data from FY2022-2024.

KEY CONTEXT:
- Earmarks are Congressional funding directed to specific recipients/projects
- Data covers fiscal years 2022-2024 (federal fiscal year = Oct 1 - Sep 30)
- Member field may contain multiple congresspeople per earmark
- Amounts are in nominal dollars

${documentSearch.content}
`;

  const context = `
You are an AI assistant for a federal earmarks database called Mosaic. You help users query and understand earmark allocations.

${earmarkReference}

${conversationContext ? `${conversationContext}\n` : ''}

DATABASE CONTEXT:
- The database contains earmark allocations for federal funding from FY 2022-2024
- The user asked: "${question}"
- Filters applied: ${filterSummary.length > 0 ? filterSummary.join(', ') : 'None'}
- Number of matching records: ${earmarks.length}

${earmarks.length > 0 
  ? `SAMPLE RECORDS:
${sampleRecords}

${stats}`
  : 'No matching records found.'}

INSTRUCTIONS:
1. **Be direct and concise** - provide exactly what the user asked for
2. **For listing queries**: Start your response with exactly "SAMPLE RECORDS:" then present the raw data without any markdown formatting
3. **For summary queries**: Provide totals and key statistics without excessive commentary
4. **Format dollar amounts clearly** (e.g., $1.5 million or $500,000)
5. **Show ALL available records** when user asks for "all" or "list"
6. **Avoid unnecessary analysis** unless specifically requested
7. **No promotional language** or suggestions for next steps unless asked
8. **If no records found**: Simply state the fact and suggest alternatives briefly

**CRITICAL**: When showing project lists, respond with exactly what is provided in the SAMPLE RECORDS section with no changes, additions, or reformatting.

**Response Style:**
- Direct, factual, data-focused
- Minimal commentary unless analysis is specifically requested
- Clean formatting with clear organization
- No marketing language or excessive enthusiasm
`;

  return {
    context,
    citations: documentSearch.citations
  };
}

/* Helper function to find most common value in an array */
function getMostCommon(arr: string[]): string {
  const counts = arr.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  let maxCount = 0;
  let maxVal = '';
  
  for (const [val, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxVal = val;
    }
  }
  
  return maxVal;
}

/* ────────────────────────── API handler ────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    // Get the session ID (or generate a default one)
    const sessionId = body.sessionId || 'default-session';
    
    // Accept both 'question' and 'messages' from frontend
    let question = '';
    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      // Use the latest message as the question
      const lastMsg = body.messages[body.messages.length - 1];
      question = lastMsg.text || lastMsg.content || '';
    } else {
      question = (body.question ?? '').trim();
    }
    
    console.log('Processing question:', question);

    // Add the user's message to conversation history
    addMessage(sessionId, 'user', question);
    
    // Get conversation context
    const conversationContext = getConversationContext(sessionId);

    // DEBUGGING: First, try a direct query without entity extraction
    // This will help us determine if there's data for Department of Labor in 2022
    if (question.toLowerCase().includes('labor') && question.includes('2022')) {
      console.log('DEBUG: Attempting direct query for Department of Labor 2022');
      
      // Direct query without relying on entity extraction
      const { data: directData, error: directError } = await supabase
        .from('earmarks')
        .select('*')
        .eq('agency', 'Department of Labor')
        .eq('year', 2022)
        .limit(10);
      
      if (directError) {
        console.error('Direct query error:', directError);
      } else {
        console.log(`Direct query found ${directData?.length || 0} records:`, directData);
      }

      // If we have data from the direct query, let's use that
      if (directData && directData.length > 0) {
        const contextResult = await buildOpenAIContext(
          question, 
          { 
            year: 2022, 
            agency: 'Labor', 
            member: null, 
            minAmount: null, 
            maxAmount: null, 
            keywords: [],
            location: null
          }, 
          directData,
          conversationContext
        );

        // Use the LLM directly
        const prompt = await PromptTemplate.fromTemplate(`
{context}

Provide a conversational response about the earmark data. Make it informative but friendly and accessible to someone who may not be familiar with government funding terminology.
`).format({ context: contextResult.context });

        const result = await llm.invoke(prompt);
        
        // Add the AI's response to conversation history
        addMessage(sessionId, 'assistant', result.content.toString());

        return NextResponse.json({ 
          answer: result.content, 
          data: directData.slice(0, 10),
          count: directData.length,
          citations: contextResult.citations,
          sessionId: sessionId
        });
      }
    }

    // First, try an AI-powered query interpretation approach
    const aiInterpretedQuery = await interpretQueryWithAI(question);
    console.log('AI Interpreted Query:', aiInterpretedQuery);
    
    // Fallback to entity extraction if AI interpretation fails
    const filters = aiInterpretedQuery || extractEntities(question);
    console.log('Final filters used:', filters);
    console.log('DEBUG: Original question:', question);
    console.log('DEBUG: Extracted member:', filters.member);
    
    // DEBUG: If looking for Menendez specifically, let's see what member names exist
    if (question.toLowerCase().includes('menendez')) {
      console.log('DEBUG: Looking for Menendez, checking database...');
      const { data: testData, error: testError } = await supabase
        .from('earmarks')
        .select('member')
        .ilike('member', '%menendez%')
        .limit(5);
      
      console.log('DEBUG: Direct Menendez search results:', testData);
      if (testError) console.log('DEBUG: Direct search error:', testError);
    }
    
    // Log exact query values
    console.log('Final query parameters:');
    console.log('- Year:', filters.year);
    console.log('- Agency:', filters.agency ? `Department of ${filters.agency}` : 'None');
    console.log('- Member:', filters.member);
    console.log('- Min Amount:', filters.minAmount);
    console.log('- Max Amount:', filters.maxAmount);
    console.log('- Location:', filters.location);
    console.log('- Keywords:', filters.keywords);
    
    const earmarks = await queryEarmarks(filters);
    console.log(`Found ${earmarks.length} matching earmarks`);

    // If no records found but we have filters, try a more relaxed query
    if (earmarks.length === 0 && (filters.year || filters.agency || filters.location)) {
      console.log('No records found with strict filters, trying relaxed query');
      
      // Try querying with just the location if specified
      if (filters.location) {
        const { data: locationData, error: locationError } = await supabase
          .from('earmarks')
          .select('*')
          .ilike('location', `%${filters.location}%`)  // Using ilike for more flexibility
          .limit(10);
        
        if (!locationError && locationData && locationData.length > 0) {
          console.log(`Found ${locationData.length} records for location ${filters.location}`);
          
          const answer = `I couldn't find earmarks matching all your criteria, but I found ${locationData.length} earmarks in ${filters.location}. Would you like to see those?`;
          
          // Add the AI's response to conversation history
          addMessage(sessionId, 'assistant', answer);
          
          return NextResponse.json({
            answer: answer,
            data: locationData,
            count: locationData.length,
            suggestion: `Show me earmarks in ${filters.location}`,
            sessionId: sessionId
          });
        }
      }
      
      // Try querying with just the year if we have it
      if (filters.year) {
        const { data: yearData, error: yearError } = await supabase
          .from('earmarks')
          .select('*')
          .eq('year', filters.year)
          .limit(10);
        
        if (!yearError && yearData && yearData.length > 0) {
          console.log(`Found ${yearData.length} records for year ${filters.year}`);
          
          // If we were looking for a specific member, mention that specifically
          let answer = '';
          if (filters.member) {
            answer = `I couldn't find any earmarks for ${filters.member} in ${filters.year}. However, I found ${yearData.length} other earmarks from ${filters.year}. Would you like to see those, or try a different year for ${filters.member}?`;
          } else {
            answer = `I couldn't find earmarks matching all your criteria, but I found ${yearData.length} earmarks from ${filters.year}. Would you like to see those instead?`;
          }
          
          // Add the AI's response to conversation history
          addMessage(sessionId, 'assistant', answer);
          
          return NextResponse.json({
            answer: answer,
            data: yearData,
            count: yearData.length,
            suggestion: filters.member ? `Show me earmarks for ${filters.member}` : `Show me earmarks from ${filters.year}`,
            sessionId: sessionId
          });
        }
      }
      
      // Try querying with just the agency if we have it
      if (filters.agency) {
        const agencyName = `Department of ${filters.agency}`;
        const { data: agencyData, error: agencyError } = await supabase
          .from('earmarks')
          .select('*')
          .eq('agency', agencyName)
          .limit(10);
        
        if (!agencyError && agencyData && agencyData.length > 0) {
          console.log(`Found ${agencyData.length} records for agency ${agencyName}`);
          
          const answer = `I couldn't find earmarks for ${agencyName} matching all your criteria, but I found ${agencyData.length} earmarks for ${agencyName} from other years. Would you like to see those?`;
          
          // Add the AI's response to conversation history
          addMessage(sessionId, 'assistant', answer);
          
          return NextResponse.json({
            answer: answer,
            data: agencyData,
            count: agencyData.length,
            suggestion: `Show me earmarks from ${agencyName}`,
            sessionId: sessionId
          });
        }
      }
    }

    // Build context for OpenAI
    const contextResult = await buildOpenAIContext(question, filters, earmarks, conversationContext);
    
    // Create a prompt template and invoke the model directly
    const promptTemplate = PromptTemplate.fromTemplate(`
{context}

Provide a direct, concise response with the requested data. Focus on facts and figures without unnecessary commentary or analysis. Present information in a clear, organized format.
`);

    const formattedPrompt = await promptTemplate.format({ context: contextResult.context });
    const result = await llm.invoke(formattedPrompt);
    
    // Add the AI's response to conversation history
    addMessage(sessionId, 'assistant', result.content.toString());

    return NextResponse.json({ 
      answer: result.content, 
      data: earmarks.slice(0, 10),
      count: earmarks.length,
      citations: contextResult.citations,
      sessionId: sessionId
    });

  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}