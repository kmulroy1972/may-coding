import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { supabase } from '@/lib/supabase';
import type { Earmark } from '@/types';

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
    /\b(?:U\.?S\.?\s+)?(?:Department|Dept\.?)\s+of\s+([\w\s&]+)|\b([A-Z]{2,})\b\s+Department/i
  );

  const overMatch  = question.match(/(?:over|above|greater than)\s+\$?([\d.,]+\s*(?:m(?:illion)?)?)/i);
  const underMatch = question.match(/(?:under|below|less than)\s+\$?([\d.,]+\s*(?:m(?:illion)?)?)/i);

  const member = memberMatch ? memberMatch[1] : null;
  const year   = yearMatch   ? parseInt(yearMatch[1], 10) : null;
  const agency = agencyMatch ? (agencyMatch[1] || agencyMatch[2]).trim() : null;

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
  let q = supabase.from('earmarks').select('*');

  if (f.member)     q = q.ilike('member', `%${f.member}%`);
  if (f.year)       q = q.eq('year', f.year);
  if (f.agency)     q = q.ilike('agency', `%${f.agency}%`);
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
  if (error) throw new Error(error.message);
  return data || [];
}

/* ────────────────────────── API handler ────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    const q = (question ?? '').trim();

    const filters  = extractEntities(q);
    const earmarks = await queryEarmarks(filters);

    /* ── context string & markdown table build ─────────────────── */
    const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const total = earmarks.reduce((sum, e) => sum + (e.amount || 0), 0);
    const header = earmarks.length
      ? `Matched ${earmarks.length} earmark${earmarks.length > 1 ? 's' : ''} worth ${fmt(total)}.`
      : 'No matching earmarks found.';
    const tableRows = earmarks.slice(0, 10).map(
      e => `| ${e.year} | ${e.recipient} | ${fmt(e.amount)} | ${e.agency || ''} | ${e.subcommittee || ''} |`
    );
    const context =
      header +
      (tableRows.length
        ? '\n\n| Year | Recipient | Amount | Agency | Subcommittee |\n' +
          '|------|-----------|--------|--------|--------------|\n' +
          tableRows.join('\n')
        : '');

    /* ── prompt the LLM ────────────────────────────────────────── */
    const prompt = PromptTemplate.fromTemplate(`
You are an assistant who answers questions about U.S. congressional earmarks.

Context:
{context}

When you answer:
• Start with a brief summary.
• If the context includes a markdown table, reference it instead of repeating all rows.

Question: {question}
    `.trim());

    const chain = new LLMChain({ llm, prompt });
    const { text } = await chain.call({ context, question: q });

    return NextResponse.json({ answer: text, count: earmarks.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}