import { supabase } from "./supabase";

// Type the OpenAI message object
type Message = { role: "user" | "assistant" | "system", content: string };

interface Earmark {
  year: number;
  member: string;
  recipient: string;
  amount: number;
  location?: string;
}

// Helper: query earmarks based on user's message (very basic example)
async function queryEarmarksFromMessage(message: string): Promise<Earmark[]> {
  // Simple keyword parsing (can be boosted later)
  // E.g., if user writes: "What earmarks did Sen. Menendez secure in 2022?"
  const yearMatch = message.match(/\b(20\d{2})\b/);
  const memberMatch = message.match(/Sen\.?\s+(\w+)/i);
  const year = yearMatch ? Number(yearMatch[1]) : undefined;
  const member = memberMatch ? "Menendez" : undefined;
  // Or: parse for "Sen. X", "Rep. Y" etc.

  let query = supabase.from("earmarks").select("*").limit(10); // limit for demo

  if (year) query = query.eq("year", year);
  if (member) query = query.ilike("member", `%${member}%`);

  const { data, error } = await query;
  if (error) return [];
  return data as Earmark[];
}

export async function askOpenAI(messages: Message[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "OPENAI API key not found.";

  try {
    // Check the last user message: use to query Supabase
    const lastUserMsg = messages.slice().reverse().find(m => m.role === "user")?.content || "";

    // 1. Query Supabase table for relevant earmarks
    const earmarkData = await queryEarmarksFromMessage(lastUserMsg);

    // 2. If data found, prep a data summary, else just answer with OpenAI
    const userPlusData: Message[] = [...messages];
    if (earmarkData && earmarkData.length > 0) {
      // Build a brief summary string (tune as needed):
      const summaryRows = earmarkData.map(
        (e, i) =>
          `${i+1}. Year: ${e.year}, Member: ${e.member}, Recipient: ${e.recipient}, Amount: $${e.amount.toLocaleString()}`
      ).join('\n');

      userPlusData.push({
        role: "system",
        content: `The following are the most relevant earmarks I found in the database:\n${summaryRows}\nPlease use this data to answer user queries as accurately as possible.`
      });
    } else {
      userPlusData.push({
        role: "system",
        content: "I searched the earmark database but found no directly matching records."
      });
    }

    // 3. Send ALL conversation plus data summary to OpenAI for answering:
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: userPlusData,
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error("OpenAI response error:", await res.text());
      return "Sorry, there was an error contacting OpenAI.";
    }

    const data = await res.json();
    if (
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      return data.choices[0].message.content.trim();
    } else {
      return "No answer received.";
    }
  } catch (err) {
    return "An error occurred: " + (err instanceof Error ? err.message : String(err));
  }
}