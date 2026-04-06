import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Menu ─────────────────────────────────────────────────────────────────────

export async function getMenu() {
  const res = await api.get('/menu');
  return res.data;
}

export async function getMenuItem(id: number) {
  const res = await api.get(`/menu/${id}`);
  return res.data;
}

// ─── Reservations ─────────────────────────────────────────────────────────────

export interface CreateReservationData {
  customer_name: string;
  customer_email: string;
  table_id: number;
  party_size: number;
  date: string;
  time_slot: string;
}

export async function createReservation(data: CreateReservationData) {
  const res = await api.post('/reservations', data);
  return res.data;
}

export async function getReservations() {
  const res = await api.get('/reservations');
  return res.data;
}

export async function getReservation(id: number) {
  const res = await api.get(`/reservations/${id}`);
  return res.data;
}

export async function cancelReservation(id: number) {
  const res = await api.delete(`/reservations/${id}`);
  return res.data;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItemData {
  menu_item_id: number;
  quantity: number;
}

export interface CreateOrderData {
  table_id: number;
  customer_name: string;
  items: OrderItemData[];
  payment_method: string;
}

export async function createOrder(data: CreateOrderData) {
  const res = await api.post('/orders', data);
  return res.data;
}

export async function getOrders(status?: string) {
  const params = status ? { status } : {};
  const res = await api.get('/orders', { params });
  return res.data;
}

export async function getOrder(id: number) {
  const res = await api.get(`/orders/${id}`);
  return res.data;
}

export async function updateOrderStatus(id: number, status: string) {
  const res = await api.put(`/orders/${id}/status`, { status });
  return res.data;
}

// ─── Kitchen ──────────────────────────────────────────────────────────────────

export async function getKitchenQueue() {
  const res = await api.get('/kitchen/queue');
  return res.data;
}

export async function advanceKitchenOrder(id: number) {
  const res = await api.put(`/kitchen/orders/${id}/advance`);
  return res.data;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function processPayment(orderId: number) {
  const res = await api.post(`/payments/${orderId}/process`, {}, { timeout: 12000 });
  return res.data;
}

export async function getPayments() {
  const res = await api.get('/payments');
  return res.data;
}

// ─── Admin / Failures ─────────────────────────────────────────────────────────

export async function getFailures() {
  const res = await api.get('/admin/failures');
  return res.data;
}

export async function enableFailure(mode: string) {
  const res = await api.post(`/admin/failures/${mode}/enable`);
  return res.data;
}

export async function disableFailure(mode: string) {
  const res = await api.post(`/admin/failures/${mode}/disable`);
  return res.data;
}

export async function getAdminStats() {
  const res = await api.get('/admin/stats');
  return res.data;
}

export async function seedDatabase() {
  const res = await api.post('/admin/seed');
  return res.data;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth() {
  const res = await api.get('/health');
  return res.data;
}
