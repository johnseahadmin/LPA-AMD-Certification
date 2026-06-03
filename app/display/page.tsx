// app/display/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, Booking } from '@/lib/types';

export default function DisplayPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sessionDate, setSessionDate] = useState('');
  const [time, setTime] = useState(new Date());

  // Tick clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    const sRes = await fetch('/api/sessions');
    if (!sRes.ok) return;
    const session = await sRes.json();
    setSessionDate(new Date(session.date).toLocaleDateString('en-SG', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }));

    const [bRes, rRes] = await Promise.all([
      fetch(`/api/bookings?session_id=${session.id}`),
      fetch(`/api/rooms?session_id=${session.id}`)
    ]);
    const [b, r] = await Promise.all([bRes.json(), rRes.json()]);
    setBookings(Array.isArray(b) ? b : []);
    setRooms(Array.isArray(r) ? r : []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeInRoom = bookings.filter(b => b.assigned_room_id && !b.completed);
  const waitingQueue = bookings
    .filter(b => b.attended && !b.assigned_room_id && !b.completed)
    .sort((a, b) => a.slot_time.localeCompare(b.slot_time));

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">LPA & AMD Certification</h1>
          <p className="text-slate-400 text-lg mt-1">{sessionDate}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-mono font-light tabular-nums">
            {time.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-slate-400 text-sm">
            {time.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* Room cards */}
      {rooms.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-400 uppercase tracking-widest mb-4">Now in Room</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(rooms.length, 3)}, 1fr)` }}>
            {rooms.map(room => {
              const current = activeInRoom.find(b => b.assigned_room_id === room.id);
              return (
                <div key={room.id}
                  className={`rounded-2xl p-6 border-2 transition-all duration-500 ${
                    current
                      ? 'bg-indigo-900/60 border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-800 border-slate-700'
                  }`}>
                  <div className="text-slate-400 text-sm font-medium uppercase tracking-wider">{room.room_name}</div>
                  <div className="text-slate-500 text-xs mb-3">{room.doctor_name} · {room.service_type}</div>
                  {current ? (
                    <div>
                      <div className="text-2xl font-bold text-white">{current.full_name}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          current.service_type === 'LPA' ? 'bg-blue-500/30 text-blue-300' :
                          current.service_type === 'AMD' ? 'bg-purple-500/30 text-purple-300' :
                          'bg-indigo-500/30 text-indigo-300'
                        }`}>
                          {current.service_type}
                        </span>
                        {current.called_at && (
                          <span className="text-xs text-slate-500">
                            since {new Date(current.called_at).toLocaleTimeString('en-SG', { hour:'2-digit', minute:'2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 italic text-lg">Available</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Waiting queue */}
      {waitingQueue.length > 0 && (
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Please Wait — You Will Be Called
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {waitingQueue.map((booking, idx) => (
              <div key={booking.id}
                className={`rounded-xl p-4 ${idx === 0 ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800 border border-slate-700'}`}>
                <div className={`text-xs font-bold mb-1 ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {idx === 0 ? '▶ UP NEXT' : `#${idx + 1}`}
                </div>
                <div className="font-semibold text-white">{booking.full_name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{booking.service_type}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {waitingQueue.length === 0 && activeInRoom.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-600">
            <div className="text-6xl mb-4">🟢</div>
            <div className="text-xl">All clear — no clients waiting</div>
          </div>
        </div>
      )}

      <div className="text-center text-slate-700 text-xs mt-6">
        Please approach the facilitator if you need assistance
      </div>
    </div>
  );
}
