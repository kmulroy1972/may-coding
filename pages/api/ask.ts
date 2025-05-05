import { OpenAI } from "@langchain/openai";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Initialize OpenAI (set your API key in .env.local)
const openai = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// LangChain prompt template for extracting search intent
const prompt = new PromptTemplate({
  template: "Extract the main intent and keywords from this question: {question}",
  inputVariables: ["question"],
});

// Build the chain
const chain = new LLMChain({ llm: openai, prompt });

interface Earmark {
  year: number;
  member: string;
  recipient: string;
  amount: number;
  location?: string;
}

// Search Earmarks in Supabase (returns up to 10 results, simple match on keywords/year/member)
async function searchEarmarkDatabase(intentString: string): Promise<string> {
  // Try to extract year and member (tune as needed)
  const yearMatch = intentString.match(/\b(20\d{2})\b/);
  const memberMatch = intentString.match(/Sen\.?\s+(\w+)/i);

  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  const member = memberMatch ? memberMatch[1] : undefined; // Just the name

  // Start query
  let query = supabase.from('earmarks').select('year, member, recipient, amount, location').limit(10);

  if (year) query = query.eq('year', year);
  if (member) query = query.ilike('member', `%${member}%`);
  // Optionally: add more logic for keywords!

  // Do the query
  const { data, error } = await query;
  if (error) return `Sorry, there was a database error: ${error.message}`;

  if (!data || !data.length)
    return "I couldn't find any earmarks matching your request.";

  // Format the results for the answer (simple text table)
  const table = data.map((row: Earmark, i: number) =>
    `${i + 1}. Year: ${row.year}, Member: ${row.member}, Recipient: ${row.recipient}, Amount: $${row.amount.toLocaleString()}, Location: ${row.location || ""}`
  ).join('\n');
  return `Here are some matching earmarks:\n${table}`;
}

// Next.js handler for POST /api/ask
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const userQuestion = req.body.question;
    if (!userQuestion || !userQuestion.trim()) {
      res.status(400).json({ answer: "No question provided." });
      return;
    }
    // a) Extract keywords/intent from user's question
    const response = await chain.call({ question: userQuestion });
    const extracted = response.text.trim();

    // b) Search the database using the extracted info
    const answer = await searchEarmarkDatabase(extracted);

    // c) Return results
    res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
} 