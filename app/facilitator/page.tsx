// app/facilitator/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, Room, Booking, ServiceType } from '@/lib/types';

const PIN = process.env.NEXT_PUBLIC_FACILITATOR_PIN || '1234';

// Walk-in modal
function WalkInModal({ session, rooms, onClose, onAdd }: {
  session: Session; rooms: Room[];
  onClose: () => void; onAdd: (b: Booking) => void;
}) {
  const [form, setForm] = useState({ full_name: '', nric_last4: '', phone: '', service_type: 'LPA' as ServiceType });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const now = new Date();
    const slot = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, slot_time: slot, walk_in: true, attended: true, ...form })
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) { onAdd(data); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="font-bold text-lg mb-4">Add Walk-in Client</h2>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Full Name" value={form.full_name}
            onChange={e => setForm(f => ({...f, full_name: e.target.value}))}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="NRIC last 4" maxLength={4} value={form.nric_last4}
              onChange={e => setForm(f => ({...f, nric_last4: e.target.value.toUpperCase()}))}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono" />
            <input required placeholder="Phone" value={form.phone}
              onChange={e => setForm(f => ({...f, phone: e.target.value}))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['LPA','AMD','BOTH'] as ServiceType[]).map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({...f, service_type: t}))}
                className={`py-2 rounded-lg text-xs font-medium ${form.service_type===t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {t === 'BOTH' ? 'LPA+AMD' : t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Room config modal
function RoomConfigModal({ session, rooms, onClose, onSave }: {
  session: Session; rooms: Room[];
  onClose: () => void; onSave: (rooms: Room[]) => void;
}) {
  const [localRooms, setLocalRooms] = useState(
    rooms.length > 0 ? rooms : [
      { id: '', session_id: session.id, room_name: '', doctor_name: '', service_type: 'LPA' as ServiceType, display_order: 0 },
      { id: '', session_id: session.id, room_name: '', doctor_name: '', service_type: 'AMD' as ServiceType, display_order: 1 },
    ]
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/rooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, rooms: localRooms })
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { onSave(data); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="font-bold text-lg mb-4">Configure Rooms</h2>
        <div className="space-y-4 mb-4">
          {localRooms.map((room, i) => (
            <div key={i} className="border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Room {i+1}</span>
                <button onClick={() => setLocalRooms(r => r.filter((_,j) => j !== i))}
                  className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
              <input placeholder="Room Name (e.g. Meeting Room 3)" value={room.room_name}
                onChange={e => setLocalRooms(r => r.map((rm,j) => j===i ? {...rm, room_name: e.target.value} : rm))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Doctor Name" value={room.doctor_name}
                onChange={e => setLocalRooms(r => r.map((rm,j) => j===i ? {...rm, doctor_name: e.target.value} : rm))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-1">
                {(['LPA','AMD','BOTH'] as ServiceType[]).map(t => (
                  <button key={t} type="button"
                    onClick={() => setLocalRooms(r => r.map((rm,j) => j===i ? {...rm, service_type: t} : rm))}
                    className={`py-1.5 rounded-lg text-xs font-medium ${room.service_type===t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {t === 'BOTH' ? 'LPA+AMD' : t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setLocalRooms(r => [...r, { id:'', session_id: session.id, room_name:'', doctor_name:'', service_type:'LPA', display_order: r.length }])}
          className="w-full border-2 border-dashed border-slate-200 rounded-xl py-2 text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 mb-4">
          + Add Room
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Rooms'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FacilitatorPage() {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showRoomConfig, setShowRoomConfig] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'IN_ROOM' | 'DONE'>('ALL');

  const load = useCallback(async (s: Session) => {
    const [bRes, rRes] = await Promise.all([
      fetch(`/api/bookings?session_id=${s.id}`),
      fetch(`/api/rooms?session_id=${s.id}`)
    ]);
    const [b, r] = await Promise.all([bRes.json(), rRes.json()]);
    setBookings(Array.isArray(b) ? b : []);
    setRooms(Array.isArray(r) ? r : []);
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/sessions').then(r => r.json()).then(s => {
      setSession(s);
      load(s);
    }).catch(() => {});
  }, [authed, load]);

  // Realtime subscription
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('facilitator')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => load(session))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, load]);

  const markAttended = async (id: string, attended: boolean) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended })
    });
  };

  const assignRoom = async (bookingId: string, roomId: string) => {
    await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_room_id: roomId, called_at: new Date().toISOString() })
    });
  };

  const markComplete = async (id: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, completed_at: new Date().toISOString() })
    });
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === 'PENDING') return b.attended && !b.assigned_room_id && !b.completed;
    if (filter === 'IN_ROOM') return b.assigned_room_id && !b.completed;
    if (filter === 'DONE') return b.completed;
    return true;
  });

  const stats = {
    total: bookings.length,
    attended: bookings.filter(b => b.attended).length,
    inRoom: bookings.filter(b => b.assigned_room_id && !b.completed).length,
    done: bookings.filter(b => b.completed).length,
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-slate-800 mb-6">Facilitator Access</h1>
          <input
            type="password" placeholder="Enter PIN"
            value={pin} onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pin === PIN && setAuthed(true)}
            className="w-full border rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button onClick={() => pin === PIN && setAuthed(true)}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold">
            Enter
          </button>
          {pin && pin !== PIN && <p className="text-red-500 text-sm mt-2">Incorrect PIN</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {showWalkIn && session && (
        <WalkInModal session={session} rooms={rooms} onClose={() => setShowWalkIn(false)}
          onAdd={b => setBookings(prev => [...prev, b])} />
      )}
      {showRoomConfig && session && (
        <RoomConfigModal session={session} rooms={rooms} onClose={() => setShowRoomConfig(false)}
          onSave={r => setRooms(r)} />
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800">Facilitator Panel</h1>
          {session && (
            <p className="text-xs text-slate-400">
              {new Date(session.date).toLocaleDateString('en-SG', { weekday:'short', day:'numeric', month:'short' })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRoomConfig(true)}
            className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200">
            ⚙️ Rooms
          </button>
          <button onClick={() => setShowWalkIn(true)}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
            + Walk-in
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 p-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-slate-700' },
          { label: 'Arrived', value: stats.attended, color: 'bg-blue-600' },
          { label: 'In Room', value: stats.inRoom, color: 'bg-amber-500' },
          { label: 'Done', value: stats.done, color: 'bg-green-600' },
        ].map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-3 text-center`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rooms display */}
      {rooms.length > 0 && (
        <div className="px-4 mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${rooms.length}, 1fr)` }}>
          {rooms.map(room => {
            const currentClient = bookings.find(b => b.assigned_room_id === room.id && !b.completed);
            return (
              <div key={room.id} className="bg-white rounded-xl p-3 border-2 border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">{room.room_name}</div>
                <div className="text-xs text-slate-400">{room.doctor_name}</div>
                <div className="mt-2">
                  {currentClient ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <div className="text-sm font-semibold text-amber-800">{currentClient.full_name}</div>
                      <div className="text-xs text-amber-600">{currentClient.service_type}</div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-300 italic">Available</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-4 flex gap-2 mb-3">
        {(['ALL','PENDING','IN_ROOM','DONE'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter===f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            {f === 'IN_ROOM' ? 'In Room' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="px-4 space-y-2 pb-8">
        {filteredBookings.map(booking => {
          const slotLabel = booking.slot_time.slice(0,5);
          const assignedRoom = rooms.find(r => r.id === booking.assigned_room_id);

          return (
            <div key={booking.id}
              className={`bg-white rounded-xl p-4 border-l-4 ${
                booking.completed ? 'border-green-400 opacity-70' :
                booking.assigned_room_id ? 'border-amber-400' :
                booking.attended ? 'border-blue-400' : 'border-slate-200'
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{booking.full_name}</span>
                    {booking.walk_in && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Walk-in</span>}
                    {booking.completed && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">✓ Done</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {slotLabel} · {booking.service_type} · ···{booking.nric_last4}
                  </div>
                  {assignedRoom && (
                    <div className="text-xs text-amber-600 mt-1 font-medium">→ {assignedRoom.room_name}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {/* Attendance toggle */}
                  {!booking.completed && (
                    <button
                      onClick={() => markAttended(booking.id, !booking.attended)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                        booking.attended ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-blue-50'
                      }`}>
                      {booking.attended ? '✓ Arrived' : 'Mark Arrived'}
                    </button>
                  )}

                  {/* Assign room */}
                  {booking.attended && !booking.completed && rooms.length > 0 && (
                    <select
                      value={booking.assigned_room_id || ''}
                      onChange={e => e.target.value && assignRoom(booking.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white">
                      <option value="">Assign Room</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.room_name}</option>
                      ))}
                    </select>
                  )}

                  {/* Mark complete */}
                  {booking.assigned_room_id && !booking.completed && (
                    <button onClick={() => markComplete(booking.id)}
                      className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-green-700">
                      Mark Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div className="text-center text-slate-300 py-12 text-sm">No clients in this view</div>
        )}
      </div>
    </div>
  );
}
// In the PIN gate in facilitator/page.tsx, add a role toggle:
const [role, setRole] = useState<'FACILITATOR'|'DOCTOR'>('FACILITATOR');

// Then in the main panel, conditionally hide room config and walk-in for DOCTOR role:
// Only show "Mark Done" and the room assignment for their room
