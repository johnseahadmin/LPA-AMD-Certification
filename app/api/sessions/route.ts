// app/api/sessions/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('is_active', true)
    .order('date', { ascending: true })
    .limit(1)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  
  // Deactivate all existing sessions first
  await supabaseAdmin.from('sessions').update({ is_active: false }).neq('id', '0');
  
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ ...body, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
