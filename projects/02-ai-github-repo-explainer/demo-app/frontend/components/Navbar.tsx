'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Zap, Activity } from 'lucide-react'
import { api } from '@/lib/api'

export function Navbar() {
  const [cartCount, setCartCount] = useState(0)

  const fetchCartCount = async () => {
    try {
      if (typeof window === 'undefined') return
      const cart = await api.getCart()
      setCartCount(cart.total_items)
    } catch {
      // Silently fail — cart not required for navigation
    }
  }

  useEffect(() => {
    fetchCartCount()
    // Poll cart count every 5 seconds to stay in sync
    const interval = setInterval(fetchCartCount, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#2e2e2e] bg-[#0f0f0f]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-xl">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          ShopFlow
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <Link href="/products" className="hover:text-white transition-colors">
            Products
          </Link>
          <Link href="/products?category=Electronics" className="hover:text-white transition-colors">
            Electronics
          </Link>
          <Link href="/products?category=Clothing" className="hover:text-white transition-colors">
            Clothing
          </Link>
          <Link href="/products?category=Books" className="hover:text-white transition-colors">
            Books
          </Link>
          <Link href="/products?category=Home" className="hover:text-white transition-colors">
            Home
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/operator"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-white border border-[#2e2e2e] hover:border-indigo-500/50 rounded-lg transition-all"
          >
            <Activity size={12} />
            Operator
          </Link>

          <Link
            href="/cart"
            className="relative flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-indigo-500/50 text-gray-300 hover:text-white rounded-lg transition-all text-sm"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 rounded-full text-xs text-white flex items-center justify-center font-bold">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
