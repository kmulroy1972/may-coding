import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST /api/search
export async function POST(req: Request) {
  const { query, filters } = await req.json();

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ data: [] });
  }

  let sb = supabase.rpc('search_earmarks', { query });

  if (filters?.year)   sb = sb.eq('year', Number(filters.year));
  if (filters?.member) sb = sb.ilike('member', `%${filters.member}%`);

  const { data, error } = await sb.limit(1000);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}