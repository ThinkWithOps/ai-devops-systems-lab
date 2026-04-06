'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Trash2, ArrowRight, Package } from 'lucide-react'
import { CartItemRow } from '@/components/CartItem'
import { api, Cart } from '@/lib/api'

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCart = async () => {
    try {
      const data = await api.getCart()
      setCart(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCart()
  }, [])

  const handleRemove = async (itemId: number) => {
    try {
      const updated = await api.removeFromCart(itemId)
      setCart(updated)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    try {
      const updated = await api.updateCartItem(itemId, quantity)
      setCart(updated)
    } catch (err) {
      console.error(err)
    }
  }

  const handleClearCart = async () => {
    try {
      await api.clearCart()
      await fetchCart()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#1a1a1a] rounded w-32" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-[#1a1a1a] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const isEmpty = !cart || cart.items.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShoppingCart size={28} className="text-indigo-400" />
          Your Cart
          {cart && cart.total_items > 0 && (
            <span className="text-lg text-gray-500 font-normal">
              ({cart.total_items} {cart.total_items === 1 ? 'item' : 'items'})
            </span>
          )}
        </h1>
        {!isEmpty && (
          <button
            onClick={handleClearCart}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
            Clear cart
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="text-center py-20 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl">
          <Package size={64} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Start browsing products to add items to your cart</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all"
          >
            Browse Products
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.items.map(item => (
              <CartItemRow
                key={item.id}
                item={item}
                onRemove={handleRemove}
                onUpdateQuantity={handleUpdateQuantity}
              />
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal ({cart.total_items} items)</span>
                  <span>${Number(cart.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-400">
                    {Number(cart.total_amount) >= 50 ? 'Free' : '$5.99'}
                  </span>
                </div>
                <div className="border-t border-[#2e2e2e] pt-3 flex justify-between font-semibold text-white text-base">
                  <span>Total</span>
                  <span className="text-indigo-400">
                    ${(
                      Number(cart.total_amount) + (Number(cart.total_amount) >= 50 ? 0 : 5.99)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all"
              >
                Proceed to Checkout
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/products"
                className="mt-3 w-full flex items-center justify-center text-sm text-gray-500 hover:text-white transition-colors py-2"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
