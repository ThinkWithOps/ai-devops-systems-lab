'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, MapPin, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { api, Cart } from '@/lib/api'

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')

  useEffect(() => {
    api.getCart()
      .then(setCart)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shippingAddress.trim()) return

    setSubmitting(true)
    setError('')

    try {
      const result = await api.checkout(shippingAddress)
      router.push(`/orders/${result.order.id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Checkout failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-8 bg-[#1a1a1a] rounded w-40 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-[#1a1a1a] rounded-xl" />
          <div className="h-48 bg-[#1a1a1a] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <AlertCircle className="mx-auto text-yellow-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
        <Link href="/products" className="text-indigo-400 hover:text-indigo-300">
          Browse Products
        </Link>
      </div>
    )
  }

  const shipping = Number(cart.total_amount) >= 50 ? 0 : 5.99
  const orderTotal = Number(cart.total_amount) + shipping

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <CreditCard size={28} className="text-indigo-400" />
        Checkout
      </h1>

      <form onSubmit={handlePlaceOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Shipping Form */}
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-indigo-400" />
                Shipping Address
              </h2>
              <textarea
                value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
                placeholder="Enter your full shipping address&#10;e.g. 123 Main St, Suite 400&#10;San Francisco, CA 94102"
                required
                rows={5}
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 text-sm resize-none"
              />
            </div>

            {/* Payment Info */}
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-400" />
                Payment
              </h2>
              <div className="bg-[#0f0f0f] border border-[#2e2e2e] rounded-lg p-4 text-sm text-gray-400">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-green-400" />
                  <span className="text-green-400 font-medium">Mock Payment Processing Active</span>
                </div>
                <p>This demo uses a mock payment provider (stripe_mock). No real charges will occur. Payments are auto-approved unless the payment_timeout failure mode is active.</p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                {cart.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="text-gray-300">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-gray-500 ml-2">x{item.quantity}</span>
                    </div>
                    <span className="text-white">
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#2e2e2e] pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${Number(cart.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-400' : ''}>
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-white text-base pt-1">
                  <span>Total</span>
                  <span className="text-indigo-400">${orderTotal.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !shippingAddress.trim()}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    Place Order — ${orderTotal.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
