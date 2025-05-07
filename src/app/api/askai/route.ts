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

interface Earmark {
  year: number;
  member: string;
  recipient: string;
  amount: number;
  location?: string;
}

// Helper: Extract member and year from question
function extractEntities(question: string) {
  const memberMatch = question.match(/Sen\\.? ([A-Za-z]+)/i);
  const yearMatch = question.match(/(20\\d{2})/);
  const member = memberMatch ? memberMatch[1] : null;
  const year = yearMatch ? parseInt(yearMatch[1]) : null;
  return { member, year };
}

// Query Supabase for earmarks
async function queryEarmarks(member: string | null, year: number | null) {
  let query = supabase
    .from("earmarks")
    .select("year, member, recipient, amount, location")
    .limit(10);

  if (year) {
    query = query.eq("year", year);
  }
  if (member) {
    query = query.ilike("member", `%${member}%`);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

// 6. Next.js API handler
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];
    const latestQuestion = messages.length > 0
      ? messages[messages.length - 1].text || messages[messages.length - 1].content
      : body.question;

    if (!latestQuestion || !latestQuestion.trim()) {
      return NextResponse.json({ answer: "No question provided." }, { status: 400 });
    }

    // Extract entities
    const { member, year } = extractEntities(latestQuestion);
    let earmarks: Earmark[] = [];
    if (member && year) {
      earmarks = await queryEarmarks(member, year);
    }

    // Compose context
    const context = member && year
      ? `Sen. ${member} secured funding for ${earmarks.length} projects in ${year}. Project list: ${earmarks.map(e => e.recipient).join(', ')}`
      : 'No specific senator or year found in the question.';

    // Build prompt for OpenAI
    const systemPrompt = { role: 'system', content: context };
    const chatHistory = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : m.sender === 'ai' ? 'assistant' : m.role || 'user',
      content: m.text || m.content
    }));
    const aiPrompt = [systemPrompt, ...chatHistory];

    // Call OpenAI via LangChain
    const prompt = new PromptTemplate({
      template: `You are an expert assistant. ONLY use the following context to answer the user's question. If the answer is not in the context, say "I don't know based on the provided data."

Context:
{context}

Conversation:
{history}
User: {question}
AI:`,
      inputVariables: ["context", "history", "question"]
    });
    const chain = new LLMChain({ llm: openai, prompt });
    const historyText = chatHistory.map((m: {role: string, content: string}) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
    const response = await chain.call({
      context,
      history: historyText,
      question: latestQuestion
    });
    const answer = response.text.trim();
    return NextResponse.json({ answer });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}