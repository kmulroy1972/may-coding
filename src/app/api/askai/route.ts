import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { supabase } from '@/lib/supabase';
import type { Earmark } from 'types/database.types';

/* ───────────────────────────── OpenAI ───────────────────────────── */
const llm = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  openAIApiKey: process.env.OPENAI_API_KEY,
  streaming: true
});

/* ────────────────────── helpers & regex section ─────────────────── */
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

  const stop = new Set(['projects','earmarks','funding','funded','department',
                        'earmark','of','the','and','in','for','on']);
  const keywords = cleaned
    .split(/\s+/)
    .map(w => w.toLowerCase().trim())
    .filter(w => w.length > 3 && !stop.has(w));

  return { member, year, agency, minAmount, maxAmount, keywords };
}

function fmt(n: number) {
  return n >= 1_000_000
    ? '$' + (n / 1_000_000).toFixed(1) + ' m'
    : '$' + n.toLocaleString();
}

/* ────────────────────── Supabase query helper ───────────────────── */
async function queryEarmarks(f: ReturnType<typeof extractEntities>): Promise<Earmark[]> {
  console.log('Starting query with filters:', JSON.stringify(f, null, 2));
  
  let q = supabase.from('earmarks').select('*');

  if (f.member)     q = q.ilike('member', `%${f.member}%`);
  if (f.year)       q = q.eq('year', f.year);
  if (f.agency)     q = q.eq('agency', `Department of ${f.agency}`);
  if (f.minAmount)  q = q.gte('amount', f.minAmount);
  if (f.maxAmount)  q = q.lte('amount', f.maxAmount);

  if (f.keywords.length) {
    const term = f.keywords.join(' ');
    q = q.or(
      `recipient.ilike.%${term}%,subcommittee.ilike.%${term}%,` +
      `account.ilike.%${term}%,location.ilike.%${term}%,budget_function.ilike.%${term}%`
    );
  }

  const { data, error } = await q.limit(1000);
  
  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(error.message);
  }
  
  console.log('Query results:', data?.length || 0, 'records found');
  return data || [];
}

/* ────────────────────────── API handler ────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    
    // Accept both 'question' and 'messages' from frontend
    let q = '';
    if (body.messages && Array.isArray(body.messages) && body.messages.length > 0) {
      // Use the latest message as the question
      const lastMsg = body.messages[body.messages.length - 1];
      q = lastMsg.text || lastMsg.content || '';
    } else {
      q = (body.question ?? '').trim();
    }
    
    console.log('Processing question:', q);

    // Simple filtering
    let query = supabase.from('earmarks').select('*');
    
    // Add filters based on keywords
    if (q.toLowerCase().includes('labor')) {
      query = query.eq('agency', 'Department of Labor');
    }
    if (q.toLowerCase().includes('2022')) {
      query = query.eq('year', 2022);
    }
    if (q.toLowerCase().includes('over') || q.toLowerCase().includes('above')) {
      query = query.gte('amount', 1000000); // Over $1M
    }

    const { data, error } = await query.limit(10);
    
    if (error) {
      throw error;
    }

    // Format the data as inline summaries
    const inlineSummaries = data.map(e =>
      `${e.year}: ${e.recipient} received $${e.amount.toLocaleString()} from ${e.agency}`
    ).join('\n');

    const response =
      data.length > 0
        ? `Found ${data.length} records:\n${inlineSummaries}`
        : 'No matching records found.';

    return NextResponse.json({ 
      answer: response,
      data: data,
      count: data.length 
    });

  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}