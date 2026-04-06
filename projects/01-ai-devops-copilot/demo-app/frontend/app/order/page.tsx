'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMenu, createOrder, getOrder, processPayment } from '@/lib/api';
import OrderStatus from '@/components/OrderStatus';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  prep_time_minutes: number;
  is_available: boolean;
}

interface SelectedItem {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
}

interface OrderResult {
  id: number;
  customer_name: string;
  table_number: number;
  status: string;
  total_amount: number;
  payment_id: number;
  payment_status: string;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
}

interface TrackingOrder {
  id: number;
  customer_name: string;
  status: string;
  total_amount: number;
  items: Array<{ name: string; quantity: number; unit_price: number }>;
  payment?: { status: string; method: string } | null;
}

export default function OrderPage() {
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [tableName, setTableName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Order tracking
  const [trackId, setTrackId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<TrackingOrder | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  // Payment
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ status: string; duration_seconds?: number; error?: string } | null>(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        const data = await getMenu();
        const items: MenuItem[] = Object.values(
          data.items_by_category as Record<string, MenuItem[]>
        ).flat();
        setAllItems(items.filter((i) => i.is_available));
      } catch {
        // ignore — order form still shows even if menu fails
      } finally {
        setMenuLoading(false);
      }
    }
    fetchMenu();
  }, []);

  const toggleItem = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const exists = prev.find((s) => s.menu_item_id === item.id);
      if (exists) {
        return prev.filter((s) => s.menu_item_id !== item.id);
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId: number, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((s) =>
          s.menu_item_id === menuItemId ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s
        )
        .filter((s) => s.quantity > 0)
    );
  };

  const total = selectedItems.reduce((sum, s) => sum + s.price * s.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return;

    setSubmitting(true);
    setOrderError(null);

    try {
      const result = await createOrder({
        table_id: parseInt(tableName),
        customer_name: customerName,
        items: selectedItems.map((s) => ({ menu_item_id: s.menu_item_id, quantity: s.quantity })),
        payment_method: paymentMethod,
      });
      setOrderResult(result);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setOrderError(String(axiosErr.response?.data?.detail ?? 'Failed to place order.'));
      } else {
        setOrderError('Failed to connect to ordering system.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackOrder = async () => {
    if (!trackId.trim()) return;
    setTrackLoading(true);
    setTrackError(null);
    setTrackedOrder(null);

    try {
      const data = await getOrder(parseInt(trackId));
      setTrackedOrder(data);
    } catch {
      setTrackError(`Order #${trackId} not found.`);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleProcessPayment = async (orderId: number) => {
    setPaymentLoading(true);
    setPaymentResult(null);
    try {
      const result = await processPayment(orderId);
      setPaymentResult(result);
      // Refresh order data
      const updated = await getOrder(orderId);
      setOrderResult((prev) => prev ? { ...prev, payment_status: updated.payment?.status ?? prev.payment_status } : prev);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setPaymentResult({ status: 'failed', error: String(axiosErr.response?.data?.detail ?? 'Payment failed') });
      } else {
        setPaymentResult({ status: 'failed', error: 'Payment request failed.' });
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const categories = ['Starters', 'Mains', 'Desserts', 'Drinks'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ─── Left: Place Order ───────────────────────────────────────── */}
        <div>
          <div className="mb-6">
            <h1 className="section-title text-3xl">Place an Order</h1>
            <p className="section-subtitle">Select items from our menu and submit your order</p>
          </div>

          {!orderResult ? (
            <form onSubmit={handlePlaceOrder} className="space-y-5">
              {/* Customer details */}
              <div className="card space-y-4">
                <h2 className="text-amber-300 font-semibold">Your Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="tableName">Table Number</label>
                    <select
                      id="tableName"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      required
                      className="input-field"
                    >
                      <option value="">Select table</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>{`Table ${n}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="customerName">Your Name</label>
                    <input
                      id="customerName"
                      type="text"
                      required
                      placeholder="e.g. Marco Rossi"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="paymentMethod">Payment Method</label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input-field"
                  >
                    <option value="card">💳 Card</option>
                    <option value="cash">💵 Cash</option>
                    <option value="online">📱 Online</option>
                  </select>
                </div>
              </div>

              {/* Menu items */}
              <div className="card">
                <h2 className="text-amber-300 font-semibold mb-4">Select Items</h2>
                {menuLoading ? (
                  <div className="flex items-center gap-2 text-stone-400 text-sm py-4">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    Loading menu…
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categories.map((cat) => {
                      const catItems = allItems.filter((i) => i.category === cat);
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h3 className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">
                            {cat}
                          </h3>
                          <div className="space-y-2">
                            {catItems.map((item) => {
                              const selected = selectedItems.find((s) => s.menu_item_id === item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                                    selected
                                      ? 'border-amber-600 bg-amber-950/30'
                                      : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
                                  }`}
                                  onClick={() => toggleItem(item)}
                                >
                                  <div className="flex-1 min-w-0 pr-2">
                                    <div className="text-amber-200 text-sm font-medium truncate">{item.name}</div>
                                    <div className="text-stone-500 text-xs">{item.prep_time_minutes} min</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-400 font-bold text-sm">£{item.price.toFixed(2)}</span>
                                    {selected && (
                                      <div
                                        className="flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(item.id, -1)}
                                          className="w-5 h-5 rounded bg-stone-700 text-amber-400 text-xs flex items-center justify-center hover:bg-stone-600"
                                        >
                                          −
                                        </button>
                                        <span className="text-white text-sm w-4 text-center">{selected.quantity}</span>
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(item.id, 1)}
                                          className="w-5 h-5 rounded bg-stone-700 text-amber-400 text-xs flex items-center justify-center hover:bg-stone-600"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order summary */}
              {selectedItems.length > 0 && (
                <div className="card-dark border-amber-800">
                  <h3 className="text-amber-300 font-semibold mb-3">Order Summary</h3>
                  <div className="space-y-1 mb-3">
                    {selectedItems.map((s) => (
                      <div key={s.menu_item_id} className="flex justify-between text-sm">
                        <span className="text-stone-300">{s.name} × {s.quantity}</span>
                        <span className="text-amber-300">£{(s.price * s.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-stone-700 pt-2 flex justify-between font-bold">
                    <span className="text-amber-200">Total</span>
                    <span className="text-amber-400 text-lg">£{total.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {orderError && (
                <div className="card border-red-800 bg-red-950/30 text-sm text-red-300">
                  ❌ {orderError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || selectedItems.length === 0}
                className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Placing Order…' : `Place Order — £${total.toFixed(2)}`}
              </button>
            </form>
          ) : (
            /* Order placed successfully */
            <div className="space-y-4">
              <div className="card border-green-800 bg-green-950/30">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">✅</span>
                  <div>
                    <h2 className="text-green-300 text-xl font-bold mb-1">Order Placed!</h2>
                    <p className="text-green-400/80 text-sm">
                      Order #{orderResult.id} has been sent to the kitchen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <OrderStatus status={orderResult.status} />
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between text-stone-400">
                    <span>Order ID:</span><span className="text-amber-300">#{orderResult.id}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Table:</span><span className="text-amber-300">{orderResult.table_number}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Total:</span><span className="text-amber-300">£{orderResult.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Payment Status:</span>
                    <span className={orderResult.payment_status === 'success' ? 'text-green-400' : 'text-yellow-400'}>
                      {orderResult.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              {orderResult.payment_status === 'pending' && (
                <div>
                  <button
                    onClick={() => handleProcessPayment(orderResult.id)}
                    disabled={paymentLoading}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {paymentLoading ? 'Processing Payment…' : '💳 Process Payment'}
                  </button>
                  {paymentResult && (
                    <div className={`mt-3 card text-sm ${paymentResult.status === 'success' ? 'border-green-700 text-green-300' : 'border-red-700 text-red-300'}`}>
                      {paymentResult.status === 'success'
                        ? `✅ Payment successful! (${paymentResult.duration_seconds}s)`
                        : `❌ Payment failed: ${paymentResult.error ?? 'Unknown error'} — check if payment_timeout failure is active.`}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => { setOrderResult(null); setSelectedItems([]); setPaymentResult(null); }}
                className="btn-secondary w-full"
              >
                Place Another Order
              </button>
            </div>
          )}
        </div>

        {/* ─── Right: Track Order ──────────────────────────────────────── */}
        <div>
          <div className="mb-6">
            <h2 className="section-title text-2xl">Track Your Order</h2>
            <p className="section-subtitle">Enter your order ID to see the current status</p>
          </div>

          <div className="card space-y-4">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Order ID (e.g. 1)"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="input-field flex-1"
              />
              <button
                onClick={handleTrackOrder}
                disabled={trackLoading || !trackId.trim()}
                className="btn-primary px-5 disabled:opacity-50"
              >
                {trackLoading ? '…' : 'Track'}
              </button>
            </div>

            {trackError && (
              <p className="text-red-400 text-sm">{trackError}</p>
            )}

            {trackedOrder && (
              <div className="space-y-4 animate-fade-in">
                <div className="border-t border-stone-700 pt-4">
                  <p className="text-stone-400 text-sm mb-1">
                    Order #{trackedOrder.id} — {trackedOrder.customer_name}
                  </p>
                  <OrderStatus status={trackedOrder.status} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-amber-300 font-medium text-sm">Items Ordered</h3>
                  {(trackedOrder.items ?? []).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-stone-300">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="text-amber-400">£{(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {trackedOrder.payment && (
                  <div className={`text-xs px-3 py-2 rounded-lg border ${
                    trackedOrder.payment.status === 'success'
                      ? 'bg-green-950/30 border-green-800 text-green-300'
                      : trackedOrder.payment.status === 'failed'
                      ? 'bg-red-950/30 border-red-800 text-red-300'
                      : 'bg-stone-800 border-stone-700 text-stone-300'
                  }`}>
                    Payment: {trackedOrder.payment.status} ({trackedOrder.payment.method})
                  </div>
                )}

                <button
                  onClick={handleTrackOrder}
                  className="btn-secondary w-full text-sm"
                >
                  Refresh Status
                </button>
              </div>
            )}

            {!trackedOrder && !trackError && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-stone-500 text-sm">Enter an order ID above to track your meal</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
