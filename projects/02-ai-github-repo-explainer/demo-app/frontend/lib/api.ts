import axios from 'axios'

// In Docker: Next.js rewrites /api/* to backend:8020
// In local dev: proxied through Next.js dev server
const BASE_URL = typeof window !== 'undefined' ? '' : (process.env.INTERNAL_API_URL || 'http://backend:8020')

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server-session'
  let sessionId = localStorage.getItem('shopflow_session_id')
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substr(2, 16)}_${Date.now()}`
    localStorage.setItem('shopflow_session_id', sessionId)
  }
  return sessionId
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach session ID to all requests
client.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    config.headers['x-session-id'] = getSessionId()
  }
  return config
})

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  stock_quantity: number
  sku: string
  is_active: boolean
  created_at: string
}

export interface CartItem {
  id: number
  cart_id: number
  product_id: number
  quantity: number
  product: Product
}

export interface Cart {
  id: number
  session_id: string
  user_id: number | null
  items: CartItem[]
  total_items: number
  total_amount: number
  created_at: string
}

export const api = {
  // Products
  async getProducts(category?: string): Promise<{ products: Product[]; total: number; category: string | null }> {
    const params = category ? { category } : {}
    const res = await client.get('/api/products', { params })
    return res.data
  },

  async getProduct(id: number): Promise<Product> {
    const res = await client.get(`/api/products/${id}`)
    return res.data
  },

  async searchProducts(query: string): Promise<Product[]> {
    const res = await client.get('/api/products/search', { params: { q: query } })
    return res.data
  },

  // Cart
  async getCart(): Promise<Cart> {
    const res = await client.get('/api/cart')
    return res.data
  },

  async addToCart(productId: number, quantity: number = 1): Promise<Cart> {
    const res = await client.post('/api/cart/items', { product_id: productId, quantity })
    return res.data
  },

  async updateCartItem(itemId: number, quantity: number): Promise<Cart> {
    const res = await client.put(`/api/cart/items/${itemId}`, { quantity })
    return res.data
  },

  async removeFromCart(itemId: number): Promise<Cart> {
    const res = await client.delete(`/api/cart/items/${itemId}`)
    return res.data
  },

  async clearCart(): Promise<void> {
    await client.delete('/api/cart')
  },

  // Checkout
  async checkout(shippingAddress: string): Promise<{
    order: { id: number; status: string; total_amount: number; shipping_address: string; created_at: string }
    payment: { id: number; status: string; amount: number; transaction_id: string | null; error_message: string | null }
  }> {
    const res = await client.post('/api/checkout', { shipping_address: shippingAddress })
    return res.data
  },

  // Orders
  async getOrder(id: number): Promise<any> {
    const res = await client.get(`/api/orders/${id}`)
    return res.data
  },

  async getOrders(): Promise<any> {
    const res = await client.get('/api/orders')
    return res.data
  },

  // Admin / Operator
  async getFailures(): Promise<{ failures: Record<string, any>; active_count: number; active_modes: string[] }> {
    const res = await client.get('/api/admin/failures')
    return res.data
  },

  async enableFailure(mode: string): Promise<any> {
    const res = await client.post(`/api/admin/failures/${mode}/enable`)
    return res.data
  },

  async disableFailure(mode: string): Promise<any> {
    const res = await client.post(`/api/admin/failures/${mode}/disable`)
    return res.data
  },

  async getStats(): Promise<any> {
    const res = await client.get('/api/admin/stats')
    return res.data
  },

  async getAdminOrders(): Promise<{ orders: any[]; total: number }> {
    const res = await client.get('/api/admin/orders')
    return res.data
  },

  async seedData(): Promise<any> {
    const res = await client.post('/api/admin/seed')
    return res.data
  },

  async getHealth(): Promise<any> {
    const res = await client.get('/api/health')
    return res.data
  },
}
