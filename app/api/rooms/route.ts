// app/api/rooms/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('*')
    .eq('session_id', sessionId!)
    .order('display_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  // Bulk replace rooms for a session
  const { session_id, rooms } = await req.json();

  await supabaseAdmin.from('rooms').delete().eq('session_id', session_id);

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .insert(rooms.map((r: any, i: number) => ({ ...r, session_id, display_order: i })))
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
