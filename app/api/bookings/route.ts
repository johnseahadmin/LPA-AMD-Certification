// app/api/bookings/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  let query = supabaseAdmin
    .from('bookings')
    .select(`*, room:assigned_room_id(*)`)
    .order('slot_time', { ascending: true });

  if (sessionId) query = query.eq('session_id', sessionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();

  // Check for double booking on same slot
  const { data: existing } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('session_id', body.session_id)
    .eq('slot_time', body.slot_time)
    .eq('service_type', body.service_type); // LPA and AMD can share a slot if diff service

  // Each slot holds max 1 per service type (LPA + AMD can coexist)
  // BOTH takes the full slot
  if (existing && existing.length > 0) {
    const hasBothConflict = body.service_type === 'BOTH' || 
      existing.some((b: any) => b.service_type === 'BOTH');
    if (hasBothConflict) {
      return NextResponse.json({ error: 'Slot not available' }, { status: 409 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
