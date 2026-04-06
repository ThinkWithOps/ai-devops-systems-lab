'use client';

import { useState } from 'react';
import { createReservation } from '@/lib/api';

const TIME_SLOTS = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'];

// Static table list (tables 1–10 with capacities)
const TABLES = [
  { id: 1, number: 1, capacity: 2 },
  { id: 2, number: 2, capacity: 2 },
  { id: 3, number: 3, capacity: 4 },
  { id: 4, number: 4, capacity: 4 },
  { id: 5, number: 5, capacity: 4 },
  { id: 6, number: 6, capacity: 6 },
  { id: 7, number: 7, capacity: 6 },
  { id: 8, number: 8, capacity: 8 },
  { id: 9, number: 9, capacity: 8 },
  { id: 10, number: 10, capacity: 8 },
];

interface ReservationResult {
  id: number;
  customer_name: string;
  table_number: number;
  party_size: number;
  date: string;
  time_slot: string;
  status: string;
}

export default function ReservePage() {
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    party_size: '2',
    date: '',
    time_slot: '19:00',
    table_id: '3',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<ReservationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createReservation({
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        party_size: parseInt(form.party_size),
        date: form.date,
        time_slot: form.time_slot,
        table_id: parseInt(form.table_id),
      });
      setSuccess(result);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
        const detail = axiosErr.response?.data?.detail;
        const status = axiosErr.response?.status;
        if (status === 409) {
          setError(
            `Booking conflict: ${String(detail ?? 'This table is already reserved for the selected time.')} ` +
            '(Note: the reservation_conflict failure mode may be active in the Operator panel.)'
          );
        } else {
          setError(String(detail ?? 'Failed to create reservation. Please try again.'));
        }
      } else {
        setError('Failed to connect to the reservation system. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTable = TABLES.find((t) => t.id === parseInt(form.table_id));

  // Get today's date as minimum date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="section-title text-3xl">Reserve a Table</h1>
        <p className="section-subtitle">
          Book your table at Bella Roma — we look forward to welcoming you
        </p>
      </div>

      {/* Success state */}
      {success && (
        <div className="card border-green-800 bg-green-950/30 mb-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <h2 className="text-green-300 text-xl font-bold mb-1">Reservation Confirmed!</h2>
              <p className="text-green-400/80 text-sm mb-3">
                Booking reference: <strong className="text-green-300">#{success.id}</strong>
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-stone-400">Name:</div>
                <div className="text-amber-200">{success.customer_name}</div>
                <div className="text-stone-400">Table:</div>
                <div className="text-amber-200">Table {success.table_number}</div>
                <div className="text-stone-400">Party Size:</div>
                <div className="text-amber-200">{success.party_size} guests</div>
                <div className="text-stone-400">Date:</div>
                <div className="text-amber-200">{success.date}</div>
                <div className="text-stone-400">Time:</div>
                <div className="text-amber-200">{success.time_slot}</div>
              </div>
              <button
                onClick={() => { setSuccess(null); setForm({ ...form, customer_name: '', customer_email: '' }); }}
                className="mt-4 btn-secondary text-sm"
              >
                Make Another Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card border-red-800 bg-red-950/30 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">❌</span>
            <div>
              <h3 className="text-red-300 font-bold mb-1">Reservation Failed</h3>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {!success && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Name */}
          <div>
            <label className="label" htmlFor="customer_name">
              Full Name
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              required
              placeholder="e.g. Marco Rossi"
              value={form.customer_name}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* Email */}
          <div>
            <label className="label" htmlFor="customer_email">
              Email Address
            </label>
            <input
              id="customer_email"
              name="customer_email"
              type="email"
              required
              placeholder="e.g. marco@example.com"
              value={form.customer_email}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* Party Size + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="party_size">
                Party Size
              </label>
              <select
                id="party_size"
                name="party_size"
                value={form.party_size}
                onChange={handleChange}
                className="input-field"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                min={today}
                value={form.date}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          {/* Time Slot + Table */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="time_slot">
                Time Slot
              </label>
              <select
                id="time_slot"
                name="time_slot"
                value={form.time_slot}
                onChange={handleChange}
                className="input-field"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="table_id">
                Table Preference
              </label>
              <select
                id="table_id"
                name="table_id"
                value={form.table_id}
                onChange={handleChange}
                className="input-field"
              >
                {TABLES.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.number} (up to {t.capacity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table info */}
          {selectedTable && (
            <div className="bg-stone-800/50 rounded-lg p-3 text-sm flex gap-3 items-center">
              <span className="text-2xl">🪑</span>
              <div>
                <span className="text-amber-300 font-medium">Table {selectedTable.number}</span>
                <span className="text-stone-400 ml-2">— seats up to {selectedTable.capacity} guests</span>
                {parseInt(form.party_size) > selectedTable.capacity && (
                  <p className="text-red-400 text-xs mt-0.5">
                    ⚠️ Party size exceeds this table&apos;s capacity — please select a larger table.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || parseInt(form.party_size) > (selectedTable?.capacity ?? 0)}
            className="btn-primary w-full text-base py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking…' : 'Confirm Reservation'}
          </button>
        </form>
      )}
    </div>
  );
}
