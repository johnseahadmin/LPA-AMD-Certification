// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Session, Booking, ServiceType } from '@/lib/types';

function generateSlots(session: Session): { time: string; label: string }[] {
  const slots = [];
  const [startH, startM] = session.start_time.split(':').map(Number);
  const [endH, endM] = session.end_time.split(':').map(Number);
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  for (let m = startMins; m < endMins; m += session.slot_duration_minutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const time = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const label = `${displayH}:${String(min).padStart(2, '0')} ${period}`;
    slots.push({ time, label });
  }
  return slots;
}

export default function ClientBookingPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('LPA');
  const [form, setForm] = useState({
    full_name: '', nric_last4: '', phone: '', email: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(s => {
        setSession(s);
        return fetch(`/api/bookings?session_id=${s.id}`);
      })
      .then(r => r.json())
      .then(setBookings)
      .catch(() => setError('No upcoming session found.'));
  }, []);

  const slots = session ? generateSlots(session) : [];

  const isSlotAvailable = (slotTime: string, svcType: ServiceType) => {
    const existing = bookings.filter(b => b.slot_time.slice(0, 5) === slotTime);
    if (existing.some(b => b.service_type === 'BOTH')) return false;
    if (svcType === 'BOTH') return existing.length === 0;
    return !existing.some(b => b.service_type === svcType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !selectedSlot) return;
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        slot_time: selectedSlot,
        service_type: serviceType,
        ...form
      })
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Booking failed. Please try again.');
    } else {
      setConfirmedBooking(data);
      setSuccess(true);
    }
  };

  if (success && confirmedBooking) {
    const slotLabel = slots.find(s => s.time === confirmedBooking.slot_time.slice(0,5))?.label;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Booking Confirmed</h1>
          <p className="text-slate-500 mb-6">See you on {new Date(session!.date).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.</p>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{confirmedBooking.full_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-medium">{slotLabel}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="font-medium">{confirmedBooking.service_type}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Reference</span><span className="font-mono text-xs">{confirmedBooking.id.slice(0, 8).toUpperCase()}</span></div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Please arrive a few minutes before your slot. A facilitator will direct you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold text-slate-800">LPA & AMD Certification</h1>
          {session && (
            <p className="text-slate-500 mt-2">
              {new Date(session.date).toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {slots[0]?.label} – {slots[slots.length - 1]?.label}
            </p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>}

        {session ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Type */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-3">Service Required</h2>
              <div className="grid grid-cols-3 gap-2">
                {(['LPA', 'AMD', 'BOTH'] as ServiceType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setServiceType(t); setSelectedSlot(''); }}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      serviceType === t
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t === 'BOTH' ? 'LPA + AMD' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-3">Choose Your Time Slot</h2>
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const avail = isSlotAvailable(slot.time, serviceType);
                  const selected = selectedSlot === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!avail}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                        !avail
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
                          : selected
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Personal Details */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="font-semibold text-slate-700">Your Details</h2>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Full Name (as in NRIC)</label>
                <input
                  required
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Tan Ah Kow"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Last 4 chars of NRIC</label>
                  <input
                    required
                    maxLength={4}
                    value={form.nric_last4}
                    onChange={e => setForm(f => ({ ...f, nric_last4: e.target.value.toUpperCase() }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="123A"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Mobile Number</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="91234567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email <span className="text-slate-400">(optional)</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="tanak@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedSlot || submitting}
              className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
            >
              {submitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          </form>
        ) : !error ? (
          <div className="text-center text-slate-400 py-20">Loading session...</div>
        ) : null}
      </div>
    </div>
  );
}
