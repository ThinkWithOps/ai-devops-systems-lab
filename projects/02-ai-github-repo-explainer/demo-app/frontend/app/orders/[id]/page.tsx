'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Package, ArrowRight, Receipt } from 'lucide-react'
import { api } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

interface OrderDetail {
  id: number
  status: string
  total_amount: number
  shipping_address: string
  items: Array<{
    id: number
    product_id: number
    product_name: string
    quantity: number
    unit_price: number
  }>
  payment: {
    id: number
    status: string
    amount: number
    transaction_id: string | null
    error_message: string | null
    processed_at: string | null
  } | null
  created_at: string
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = Number(params.id)

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getOrder(orderId)
      .then(setOrder)
      .catch(() => setError('Order not found'))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-8 bg-[#1a1a1a] rounded w-48 mb-8" />
        <div className="h-48 bg-[#1a1a1a] rounded-xl" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <XCircle className="mx-auto text-red-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
        <Link href="/products" className="text-indigo-400 hover:text-indigo-300">
          Continue Shopping
        </Link>
      </div>
    )
  }

  const paymentSuccess = order.payment?.status === 'completed'
  const paymentFailed = order.payment?.status === 'failed'

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Status Banner */}
      <div className={`rounded-xl p-6 mb-8 border ${
        paymentSuccess
          ? 'bg-green-900/20 border-green-700/50'
          : paymentFailed
          ? 'bg-red-900/20 border-red-700/50'
          : 'bg-yellow-900/20 border-yellow-700/50'
      }`}>
        <div className="flex items-center gap-3">
          {paymentSuccess ? (
            <CheckCircle size={32} className="text-green-400" />
          ) : paymentFailed ? (
            <XCircle size={32} className="text-red-400" />
          ) : (
            <Clock size={32} className="text-yellow-400" />
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {paymentSuccess
                ? 'Order Confirmed!'
                : paymentFailed
                ? 'Payment Failed'
                : 'Order Pending'}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Order #{order.id} — {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Error */}
      {paymentFailed && order.payment?.error_message && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-xl text-sm text-red-300">
          <strong>Payment Error:</strong> {order.payment.error_message}
        </div>
      )}

      {/* Order Details */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center gap-2">
          <Receipt size={16} className="text-indigo-400" />
          <h2 className="font-semibold text-white">Order Details</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Order Status</span>
            <StatusBadge status={order.status} />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Payment Status</span>
            <StatusBadge status={order.payment?.status || 'none'} />
          </div>

          {order.payment?.transaction_id && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Transaction ID</span>
              <span className="text-white font-mono text-xs">{order.payment.transaction_id}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Shipping To</span>
            <span className="text-white text-right max-w-[60%]">{order.shipping_address}</span>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center gap-2">
          <Package size={16} className="text-indigo-400" />
          <h2 className="font-semibold text-white">Items</h2>
        </div>
        <div className="divide-y divide-[#2e2e2e]">
          {order.items.map(item => (
            <div key={item.id} className="px-6 py-3 flex justify-between text-sm">
              <div>
                <span className="text-white">{item.product_name}</span>
                <span className="text-gray-500 ml-2">x{item.quantity}</span>
              </div>
              <span className="text-white">
                ${(item.unit_price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="px-6 py-3 flex justify-between font-bold text-white">
            <span>Total</span>
            <span className="text-indigo-400">${Number(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Link
          href="/products"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all"
        >
          Continue Shopping
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/operator"
          className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-indigo-500/50 text-gray-300 font-medium rounded-lg transition-all text-sm"
        >
          View Operator Dashboard
        </Link>
      </div>
    </div>
  )
}
