'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getKitchenQueue,
  advanceKitchenOrder,
  getReservations,
  cancelReservation,
  getPayments,
  getFailures,
  enableFailure,
  disableFailure,
  getAdminStats,
} from '@/lib/api';
import FailureToggle from '@/components/FailureToggle';

type Tab = 'kitchen' | 'reservations' | 'payments' | 'failures';

interface KitchenOrder {
  id: number;
  table_number: number | null;
  customer_name: string;
  status: string;
  item_count: number;
  total_amount: number;
  created_at: string;
  next_status: string | null;
  items: Array<{ name: string; quantity: number }>;
}

interface Reservation {
  id: number;
  customer_name: string;
  customer_email: string;
  table_number: number | null;
  party_size: number;
  date: string;
  time_slot: string;
  status: string;
}

interface Payment {
  id: number;
  order_id: number;
  customer_name: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
}

interface FailureInfo {
  active: boolean;
  description: string;
}

interface Stats {
  total_orders: number;
  total_reservations: number;
  total_payments: number;
  revenue_today: number;
  active_failures: number;
  order_statuses: Record<string, number>;
  payment_statuses: Record<string, number>;
}

const FAILURE_MODE_LABELS: Record<string, string> = {
  slow_menu: 'Slow Menu API',
  kitchen_down: 'Kitchen Down (503)',
  payment_timeout: 'Payment Timeout',
  reservation_conflict: 'Reservation Conflict (409)',
  db_slow: 'Database Slow',
};

export default function OperatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('failures');

  // Kitchen
  const [kitchenQueue, setKitchenQueue] = useState<KitchenOrder[]>([]);
  const [kitchenError, setKitchenError] = useState<string | null>(null);
  const [kitchenLoading, setKitchenLoading] = useState(false);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  // Reservations
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Payments
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Failures
  const [failures, setFailures] = useState<Record<string, FailureInfo>>({});
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [togglingMode, setTogglingMode] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Auto-refresh for kitchen (every 5s)
  const kitchenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Data Fetchers ────────────────────────────────────────────────────────

  const fetchKitchen = useCallback(async () => {
    setKitchenLoading(true);
    setKitchenError(null);
    try {
      const data = await getKitchenQueue();
      setKitchenQueue(data.queue ?? []);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        if (axiosErr.response?.status === 503) {
          setKitchenError(
            'Kitchen system is DOWN (503). The kitchen_down failure mode is active. ' +
            'Go to the Failures tab to disable it.'
          );
        } else {
          setKitchenError(String(axiosErr.response?.data?.detail ?? 'Kitchen request failed'));
        }
      } else {
        setKitchenError('Cannot connect to kitchen system.');
      }
      setKitchenQueue([]);
    } finally {
      setKitchenLoading(false);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const data = await getReservations();
      setReservations(data.reservations ?? []);
    } catch {
      // noop
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await getPayments();
      setPayments(data.payments ?? []);
    } catch {
      // noop
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const fetchFailures = useCallback(async () => {
    setFailuresLoading(true);
    try {
      const data = await getFailures();
      setFailures(data.failures ?? {});
    } catch {
      // noop
    } finally {
      setFailuresLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      // noop
    }
  }, []);

  // Initial load + tab switches
  useEffect(() => {
    fetchFailures();
    fetchStats();
  }, [fetchFailures, fetchStats]);

  useEffect(() => {
    if (activeTab === 'kitchen') {
      fetchKitchen();
      kitchenIntervalRef.current = setInterval(fetchKitchen, 5000);
    } else {
      if (kitchenIntervalRef.current) clearInterval(kitchenIntervalRef.current);
    }
    if (activeTab === 'reservations') fetchReservations();
    if (activeTab === 'payments') fetchPayments();
    if (activeTab === 'failures') fetchFailures();

    return () => {
      if (kitchenIntervalRef.current) clearInterval(kitchenIntervalRef.current);
    };
  }, [activeTab, fetchKitchen, fetchReservations, fetchPayments, fetchFailures]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleAdvanceOrder = async (orderId: number) => {
    setAdvancingId(orderId);
    try {
      await advanceKitchenOrder(orderId);
      await fetchKitchen();
      fetchStats();
    } catch {
      // noop
    } finally {
      setAdvancingId(null);
    }
  };

  const handleCancelReservation = async (id: number) => {
    setCancellingId(id);
    try {
      await cancelReservation(id);
      await fetchReservations();
    } catch {
      // noop
    } finally {
      setCancellingId(null);
    }
  };

  const handleToggleFailure = async (mode: string, isActive: boolean) => {
    setTogglingMode(mode);
    try {
      if (isActive) {
        await disableFailure(mode);
      } else {
        await enableFailure(mode);
      }
      await fetchFailures();
      await fetchStats();
    } catch {
      // noop
    } finally {
      setTogglingMode(null);
    }
  };

  // ─── Status helpers ───────────────────────────────────────────────────────

  const paymentStatusColor = (status: string) => {
    if (status === 'success') return 'badge-green';
    if (status === 'failed') return 'badge-red';
    if (status === 'timeout') return 'badge-yellow';
    return 'badge-blue';
  };

  const reservationStatusColor = (status: string) => {
    if (status === 'confirmed') return 'badge-green';
    if (status === 'cancelled') return 'badge-red';
    if (status === 'no_show') return 'badge-yellow';
    return 'badge-blue';
  };

  const activeFailureCount = Object.values(failures).filter((f) => f.active).length;

  const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'failures', label: 'Failure Injection', icon: '⚡' },
    { id: 'kitchen', label: 'Kitchen Queue', icon: '👨‍🍳' },
    { id: 'reservations', label: 'Reservations', icon: '📅' },
    { id: 'payments', label: 'Payments', icon: '💳' },
  ];

  return (
    <div className="min-h-screen bg-stone-950">
      {/* ─── Operator Header ──────────────────────────────────────────── */}
      <div className="bg-stone-950 border-b border-stone-800 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                🖥️ Operator Dashboard
              </h1>
              <p className="text-stone-500 text-sm mt-1">
                Bella Roma Restaurant — System Operations & Failure Injection
              </p>
            </div>
            {activeFailureCount > 0 && (
              <div className="flex items-center gap-2 bg-red-950/50 border border-red-800 rounded-lg px-4 py-2">
                <span className="text-red-400 text-lg animate-pulse">⚠️</span>
                <div>
                  <div className="text-red-300 font-bold text-sm">
                    {activeFailureCount} Active Failure{activeFailureCount !== 1 ? 's' : ''}
                  </div>
                  <div className="text-red-500 text-xs">System degraded</div>
                </div>
              </div>
            )}
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Orders', value: String(stats.total_orders), color: 'text-amber-300' },
                { label: 'Reservations', value: String(stats.total_reservations), color: 'text-blue-300' },
                { label: 'Revenue Today', value: `£${stats.revenue_today.toFixed(2)}`, color: 'text-green-300' },
                {
                  label: 'Active Failures',
                  value: String(stats.active_failures),
                  color: stats.active_failures > 0 ? 'text-red-300' : 'text-stone-400',
                },
              ].map((s) => (
                <div key={s.label} className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-stone-500 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────────── */}
      <div className="border-b border-stone-800 bg-stone-950/95 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-600'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.id === 'failures' && activeFailureCount > 0 && (
                  <span className="ml-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFailureCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tab Content ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ══ FAILURES TAB ════════════════════════════════════════════════ */}
        {activeTab === 'failures' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-amber-300 mb-1 flex items-center gap-2">
                ⚡ Failure Injection Control Panel
              </h2>
              <p className="text-stone-400 text-sm">
                Toggle failure modes to simulate production incidents. The AI DevOps Copilot will
                detect anomalies in metrics and logs and suggest remediations.
              </p>
            </div>

            {failuresLoading && Object.keys(failures).length === 0 ? (
              <div className="flex items-center gap-2 text-stone-400 text-sm py-8">
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Loading failure states…
              </div>
            ) : (
              <>
                {/* Alert banner if failures active */}
                {activeFailureCount > 0 && (
                  <div className="mb-6 bg-red-950/40 border border-red-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🚨</span>
                      <div>
                        <h3 className="text-red-300 font-bold mb-1">
                          {activeFailureCount} failure mode{activeFailureCount !== 1 ? 's' : ''} currently active
                        </h3>
                        <p className="text-red-400/80 text-sm">
                          The system is operating in degraded mode. The AI Copilot can detect these
                          anomalies from Prometheus metrics and structured logs at{' '}
                          <code className="text-red-300 bg-red-950 px-1 rounded">
                            http://localhost:8010/metrics
                          </code>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Failure mode cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(failures).map(([mode, info]) => (
                    <FailureToggle
                      key={mode}
                      mode={mode}
                      label={FAILURE_MODE_LABELS[mode] ?? mode}
                      description={info.description}
                      isActive={info.active}
                      isLoading={togglingMode === mode}
                      onToggle={() => handleToggleFailure(mode, info.active)}
                    />
                  ))}
                </div>

                {/* Quick reference */}
                <div className="mt-8 card-dark">
                  <h3 className="text-amber-300 font-semibold mb-3 text-sm">
                    📊 How the AI DevOps Copilot Detects These Failures
                  </h3>
                  <div className="space-y-2 text-xs text-stone-400">
                    <div className="grid grid-cols-3 gap-2 font-semibold text-stone-300 border-b border-stone-700 pb-1">
                      <span>Failure Mode</span>
                      <span>Signal Type</span>
                      <span>Prometheus Metric</span>
                    </div>
                    {[
                      ['slow_menu', 'Latency spike', 'restaurant_menu_request_duration_seconds'],
                      ['kitchen_down', 'HTTP 503 errors', 'http_requests_total{status="503"}'],
                      ['payment_timeout', 'Payment P99 > 5s', 'restaurant_payment_duration_seconds'],
                      ['reservation_conflict', 'HTTP 409 errors', 'http_requests_total{status="409"}'],
                      ['db_slow', 'Order latency spike', 'restaurant_orders_total + latency'],
                    ].map(([mode, signal, metric]) => (
                      <div key={mode} className="grid grid-cols-3 gap-2 py-1 border-b border-stone-800">
                        <span className="text-amber-400/80">{mode}</span>
                        <span>{signal}</span>
                        <code className="text-stone-500 text-xs break-all">{metric}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ KITCHEN TAB ════════════════════════════════════════════════ */}
        {activeTab === 'kitchen' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-amber-300 mb-1">👨‍🍳 Kitchen Queue</h2>
                <p className="text-stone-400 text-sm">
                  Active orders — auto-refreshes every 5 seconds
                </p>
              </div>
              <button onClick={fetchKitchen} className="btn-secondary text-sm">
                Refresh
              </button>
            </div>

            {kitchenError ? (
              <div className="card border-red-800 bg-red-950/30">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🔴</span>
                  <div>
                    <h3 className="text-red-300 font-bold mb-1">Kitchen System Error</h3>
                    <p className="text-red-400/80 text-sm">{kitchenError}</p>
                    <button
                      onClick={() => { setActiveTab('failures'); }}
                      className="mt-3 btn-danger text-sm"
                    >
                      Go to Failures Tab →
                    </button>
                  </div>
                </div>
              </div>
            ) : kitchenLoading && kitchenQueue.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading kitchen queue…
              </div>
            ) : kitchenQueue.length === 0 ? (
              <div className="text-center py-16 card">
                <div className="text-5xl mb-3">✅</div>
                <h3 className="text-amber-300 text-lg font-semibold mb-1">Kitchen Clear</h3>
                <p className="text-stone-400 text-sm">No pending or in-progress orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kitchenQueue.map((order) => (
                  <div key={order.id} className={`card hover:border-amber-700 transition-all ${
                    order.status === 'preparing' ? 'border-amber-700/50' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-bold text-lg">Order #{order.id}</span>
                          <span className={order.status === 'preparing' ? 'badge-yellow' : 'badge-blue'}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-stone-400 text-sm">
                          Table {order.table_number} — {order.customer_name}
                        </p>
                      </div>
                      <span className="text-amber-400 font-bold">£{order.total_amount.toFixed(2)}</span>
                    </div>

                    {/* Items list */}
                    <div className="space-y-1 mb-4">
                      {(order.items ?? []).slice(0, 4).map((item, idx) => (
                        <div key={idx} className="text-stone-300 text-sm flex gap-1">
                          <span className="text-stone-500">×{item.quantity}</span>
                          <span>{item.name}</span>
                        </div>
                      ))}
                      {(order.items ?? []).length > 4 && (
                        <div className="text-stone-500 text-xs">
                          +{order.items.length - 4} more items
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">
                        {new Date(order.created_at).toLocaleTimeString()}
                      </span>
                      {order.next_status && (
                        <button
                          onClick={() => handleAdvanceOrder(order.id)}
                          disabled={advancingId === order.id}
                          className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
                        >
                          {advancingId === order.id
                            ? '…'
                            : `→ ${order.next_status}`}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ RESERVATIONS TAB ════════════════════════════════════════════ */}
        {activeTab === 'reservations' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-amber-300 mb-1">📅 Reservations</h2>
                <p className="text-stone-400 text-sm">
                  All reservations — {reservations.length} total
                </p>
              </div>
              <button onClick={fetchReservations} className="btn-secondary text-sm">
                Refresh
              </button>
            </div>

            {reservationsLoading ? (
              <div className="text-center py-12 text-stone-400">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-16 card">
                <div className="text-5xl mb-3">📅</div>
                <p className="text-stone-400">No reservations found</p>
              </div>
            ) : (
              <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left text-stone-400 font-medium px-4 py-3">#</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Customer</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Table</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Party</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Date & Time</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r) => (
                      <tr key={r.id} className="border-b border-stone-800 hover:bg-stone-900/50 transition-colors">
                        <td className="px-4 py-3 text-stone-500">{r.id}</td>
                        <td className="px-4 py-3">
                          <div className="text-amber-200 font-medium">{r.customer_name}</div>
                          <div className="text-stone-500 text-xs">{r.customer_email}</div>
                        </td>
                        <td className="px-4 py-3 text-stone-300">Table {r.table_number}</td>
                        <td className="px-4 py-3 text-stone-300">{r.party_size} pax</td>
                        <td className="px-4 py-3 text-stone-300">
                          {r.date} <span className="text-stone-500">at</span> {r.time_slot}
                        </td>
                        <td className="px-4 py-3">
                          <span className={reservationStatusColor(r.status)}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.status === 'confirmed' && (
                            <button
                              onClick={() => handleCancelReservation(r.id)}
                              disabled={cancellingId === r.id}
                              className="btn-danger text-xs px-3 py-1 disabled:opacity-50"
                            >
                              {cancellingId === r.id ? '…' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ PAYMENTS TAB ════════════════════════════════════════════════ */}
        {activeTab === 'payments' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-amber-300 mb-1">💳 Payments</h2>
                <p className="text-stone-400 text-sm">
                  All payment records — {payments.length} total
                </p>
              </div>
              <button onClick={fetchPayments} className="btn-secondary text-sm">
                Refresh
              </button>
            </div>

            {/* Payment status summary */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {Object.entries(stats.payment_statuses).map(([status, count]) => (
                  <div key={status} className={`rounded-lg border px-4 py-3 text-center ${
                    status === 'success' ? 'border-green-800 bg-green-950/20' :
                    status === 'failed' ? 'border-red-800 bg-red-950/20' :
                    status === 'timeout' ? 'border-yellow-800 bg-yellow-950/20' :
                    'border-stone-700 bg-stone-900/30'
                  }`}>
                    <div className={`text-2xl font-bold ${
                      status === 'success' ? 'text-green-300' :
                      status === 'failed' ? 'text-red-300' :
                      status === 'timeout' ? 'text-yellow-300' :
                      'text-stone-300'
                    }`}>{String(count)}</div>
                    <div className="text-stone-500 text-xs capitalize">{status}</div>
                  </div>
                ))}
              </div>
            )}

            {paymentsLoading ? (
              <div className="text-center py-12 text-stone-400">
                <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-16 card">
                <div className="text-5xl mb-3">💳</div>
                <p className="text-stone-400">No payment records found</p>
              </div>
            ) : (
              <div className="card overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left text-stone-400 font-medium px-4 py-3">#</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Order</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Customer</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Amount</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Method</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-stone-400 font-medium px-4 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-stone-800 hover:bg-stone-900/50 transition-colors">
                        <td className="px-4 py-3 text-stone-500">{p.id}</td>
                        <td className="px-4 py-3 text-stone-300">#{p.order_id}</td>
                        <td className="px-4 py-3 text-amber-200">{p.customer_name}</td>
                        <td className="px-4 py-3 text-amber-300 font-bold">
                          £{p.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-stone-300 capitalize">{p.method}</td>
                        <td className="px-4 py-3">
                          <span className={paymentStatusColor(p.status)}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-stone-500 text-xs">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
