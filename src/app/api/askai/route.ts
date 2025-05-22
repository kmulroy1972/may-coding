import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { supabase } from '@/lib/supabase';
import type { Earmark } from 'types/database.types';
// Fix import path
import { addMessage, getConversationContext } from '@/lib/conversationMemory';

/* ───────────────────────────── OpenAI ───────────────────────────── */
const llm = new ChatOpenAI({
  modelName: 'gpt-4-turbo', // Using the latest available model for better capabilities
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7 // Add some creativity but not too much
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
  const memberMatch = question.match(
    /\b(?:Sen(?:ator)?|Rep(?:resentative)?|Congress(?:man|woman)?)\.?\s+([\w'-]+)/i
  );
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

  const member = memberMatch ? memberMatch[1] : null;
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
                        'earmark','of','the','and','in','for','on']);
  const keywords = cleaned
    .split(/\s+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 3 && !stop.has(w));

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

  // Fix member search to handle both Senator and Representative formats
  if (f.member) {
    q = q.or(`member.ilike.%Senator ${f.member}%,member.ilike.%Representative ${f.member}%`);
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
  
  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(error.message);
  }
  
  console.log('Query results:', data?.length || 0, 'records found');
  return data || [];
}

/**
 * Retrieves relevant PDF content based on the user's question
 * This is a placeholder function - implement with your PDF storage solution
 */
async function getRelevantPdfContent(question: string): Promise<string> {
  // This is where you would add your PDF content retrieval logic
  // For now, we'll return a placeholder with key information about earmarks
  
  // In a real implementation, you might:
  // 1. Use vector embeddings to find relevant PDF chunks
  // 2. Extract text from specific PDFs based on keywords
  // 3. Use a document store like Pinecone or a Supabase vector extension
  
  return `
ADDITIONAL REFERENCE INFORMATION FROM PDF DOCUMENTS:

Community Project Funding (CPF) / Earmarks Process:
- House rules call them Community Project Funding (CPF)
- Senate labels them Congressionally Directed Spending (CDS)
- FY 2025-2026 Request window: Mar 25 - Apr 15 2025 (House)
- Key rule tweaks: 15-project cap per Member, Non-profits ineligible for HUD-EDI account
- Defense, MilCon-VA, and THUD accounts restored after FY 2024 pause

For future implementation, replace this with dynamic PDF content retrieval.
`;
}

/* Function to build context for OpenAI */
async function buildOpenAIContext(
  question: string, 
  filters: ReturnType<typeof extractEntities>, 
  earmarks: Earmark[],
  conversationContext: string = ''
): Promise<string> {
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
  
  // Show sample records (up to 5)
  const sampleRecords = earmarks.slice(0, 5).map((e, i) => 
    `${i+1}. ${e.year}: ${e.recipient} received ${fmt(e.amount)} from ${e.agency}` +
    (e.location ? ` for a project in ${e.location}` : '') +
    (e.member ? ` (requested by ${e.member})` : '')
  ).join('\n');

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
- Most common recipient type: ${getMostCommon(earmarks.map(e => e.budget_function))}`;
  }

  // Get relevant PDF content
  const pdfContent = await getRelevantPdfContent(question);

  // Add the comprehensive earmark reference information
  const earmarkReference = `
SYSTEM CONTEXT: You are Mosaic's AI assistant, specialized in analyzing federal earmark (Community Project Funding) data from FY2022-2024. You have access to a Supabase database containing detailed information about Congressional earmarks. Your role is to help users understand this data through natural language queries, providing insightful, accurate responses about earmark funding patterns, trends, and specific projects.

DATABASE SCHEMA AND FIELD INTERPRETATIONS:
---------------------------------------------

Table: earmarks
  - year (int4): Fiscal Year of the appropriation. Users may refer to this as "FY2023", "in 2023", or "last year's funding".
  
  - agency (text): The federal department receiving the funds. This is always stored with the full name "Department of X" (e.g., "Department of Transportation") although users might abbreviate as "DOT" or just say "Transportation".
  
  - subunit (text): The specific agency component receiving funds (e.g., "Federal Highway Administration", "Office of Economic Development"). Users often use acronyms like "FHWA" or "Corps of Engineers".
  
  - subcommittee (text): The Appropriations subcommittee with jurisdiction. Often referenced by acronyms like "THUD" (Transportation-HUD) or "LHHS" (Labor-HHS-Education).
  
  - account (text): The specific Treasury budget account where funds are drawn from. Users might say "RDP account" or mention specific account names.
  
  - budget_number (text): Treasury Symbol identifier (rarely directly queried).
  
  - budget_function (text): OMB functional classification such as "Education, Training, Employment and Social Services" or "Transportation". Users will refer to these as categories or sectors.
  
  - recipient (text): The named entity receiving the earmark funds (e.g., "City of Madison, WI" or "Rutgers University"). This is often what users are most interested in finding.
  
  - amount (int4): Dollar amount of the earmark in nominal dollars (stored as integers without commas). Users may ask for "largest earmarks", "projects over $1 million", or "total funding for X".
  
  - location (text): Two-letter state/territory postal code (e.g., "CA", "NY", "PR"). Users will typically refer to states by their full names like "California" or "New Jersey".
  
  - member (text): The Congressional sponsor who requested the earmark, stored as "Sen. [Name]" or "Rep. [Name] (XX-##)" where XX is state code and ## is district number.

EARMARK DOMAIN KNOWLEDGE:
--------------------------
1. Definition: Earmarks (officially "Community Project Funding" in the House or "Congressionally Directed Spending" in the Senate) are line-items in appropriations acts that direct funds to specifically named recipients or locations, bypassing the normal competitive grant process.

2. Recent History:
   - 2007-2010: Peak usage (~12,000 earmarks annually)
   - 2011-2020: Complete ban under House & Senate rules
   - 2021-present: Reinstated with new transparency rules and guardrails

3. Current Process:
   - Members submit requests to Appropriations Committee during a specific window (typically March-May)
   - Each Member is limited in the number of requests (House: 15 per Member)
   - Requests require documented community support and public disclosure
   - No for-profit recipients allowed
   - Members must certify no financial interest
   - Total earmarks are capped at approximately 1% of discretionary spending

${pdfContent}
`;

  return `
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
1. Respond in a conversational, helpful tone
2. If records were found, summarize key insights about the earmarks
3. If no records were found, suggest alternative queries or explain possible reasons why
4. Always be accurate with numbers and figures
5. Provide context about earmarks when relevant (what they are, how they work)
6. If the user is asking a follow-up question, refer to previous context in the conversation
7. When showing dollar amounts, use proper formatting (e.g., $1.5 million or $500,000)
8. If referring to states, include both the state name and postal code for clarity
`;
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
        const context = await buildOpenAIContext(
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
        const prompt = PromptTemplate.fromTemplate(`
{context}

Provide a conversational response about the earmark data. Make it informative but friendly and accessible to someone who may not be familiar with government funding terminology.
`).format({ context });

        const result = await llm.invoke(prompt);
        
        // Add the AI's response to conversation history
        addMessage(sessionId, 'assistant', result.content.toString());

        return NextResponse.json({ 
          answer: result.content, 
          data: directData.slice(0, 10),
          count: directData.length,
          sessionId: sessionId
        });
      }
    }

    // Extract entities and query the database
    const filters = extractEntities(question);
    console.log('Extracted filters:', filters);
    
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
          
          const answer = `I couldn't find earmarks matching all your criteria, but I found ${yearData.length} earmarks from ${filters.year}. Would you like to see those instead?`;
          
          // Add the AI's response to conversation history
          addMessage(sessionId, 'assistant', answer);
          
          return NextResponse.json({
            answer: answer,
            data: yearData,
            count: yearData.length,
            suggestion: `Show me earmarks from ${filters.year}`,
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
    const context = await buildOpenAIContext(question, filters, earmarks, conversationContext);
    
    // Create a prompt template and invoke the model directly
    const promptTemplate = PromptTemplate.fromTemplate(`
{context}

Provide a conversational response about the earmark data. Make it informative but friendly and accessible to someone who may not be familiar with government funding terminology.
`);

    const formattedPrompt = await promptTemplate.format({ context });
    const result = await llm.invoke(formattedPrompt);
    
    // Add the AI's response to conversation history
    addMessage(sessionId, 'assistant', result.content.toString());

    return NextResponse.json({ 
      answer: result.content, 
      data: earmarks.slice(0, 10),
      count: earmarks.length,
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