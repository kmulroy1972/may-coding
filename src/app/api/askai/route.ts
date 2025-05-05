import { NextResponse } from 'next/server'
import { OpenAI } from "@langchain/openai";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { createClient } from "@supabase/supabase-js";

// 1. Initialize OpenAI (API Key from .env.local)
const openai = new OpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// 2. Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 3. LangChain prompt for extracting search intent
const prompt = new PromptTemplate({
  template: "Extract the main intent and keywords from this question: {question}",
  inputVariables: ["question"],
});

// 4. Build the chain for LLM
const chain = new LLMChain({ llm: openai, prompt });

interface Earmark {
  year: number;
  member: string;
  recipient: string;
  amount: number;
  location?: string;
}

// 5. Function to search earmarks
async function searchEarmarkDatabase(intentString: string) {
  const yearMatch = intentString.match(/\b(20\d{2})\b/);
  const memberMatch = intentString.match(/Sen\.?\s+([A-Za-z]+)/i);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  const member = memberMatch ? memberMatch[1] : undefined;

  let query = supabase
    .from("earmarks")
    .select("year, member, recipient, amount, location")
    .limit(10);

  if (year) query = query.eq("year", year);
  if (member) query = query.ilike("member", `%${member}%`);

  const { data, error } = await query;

  if (error)
    return `Sorry, there was a database error: ${error.message}`;

  if (!data || !data.length)
    return "I couldn't find any earmarks matching your request.";

  // Format the result
  const table = data
    .map(
      (row: Earmark, i: number) =>
        `${i + 1}. Year: ${row.year}, Member: ${row.member}, Recipient: ${row.recipient}, Amount: $${Number(row.amount).toLocaleString()}, Location: ${row.location || "N/A"}`
    )
    .join("\n");
  return `Here are some matching earmarks:\n${table}`;
}

// 6. Next.js API handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userQuestion = body.question || body.messages?.slice(-1)[0]?.content; // compatibility with your frontend

    if (!userQuestion || !userQuestion.trim()) {
      return NextResponse.json({ answer: "No question provided." }, { status: 400 });
    }

    // a) Extract intent/keywords
    const response = await chain.call({ question: userQuestion });
    const extracted = response.text.trim();

    // b) Search database
    const answer = await searchEarmarkDatabase(extracted);

    // c) Return answer
    return NextResponse.json({ answer });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}