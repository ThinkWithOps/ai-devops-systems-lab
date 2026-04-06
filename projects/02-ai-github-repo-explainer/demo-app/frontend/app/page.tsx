'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Zap, Shield, Truck, ArrowRight } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { api, Product } from '@/lib/api'

const CATEGORIES = ['Electronics', 'Clothing', 'Books', 'Home']

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProducts()
      .then(data => setFeaturedProducts(data.products.slice(0, 6)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="bg-hero-gradient py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-sm mb-6">
              <Zap size={14} />
              <span>AI-powered demo storefront</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Shop smarter with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                ShopFlow
              </span>
            </h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              A realistic ecommerce platform with product catalog, cart management,
              order processing, and payment handling. Built to demonstrate clear
              service boundaries and architecture patterns.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all"
              >
                <ShoppingBag size={18} />
                Browse Products
              </Link>
              <Link
                href="/operator"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] hover:bg-[#242424] border border-[#2e2e2e] text-gray-300 font-medium rounded-lg transition-all"
              >
                Operator Dashboard
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Row */}
      <section className="border-y border-[#2e2e2e] bg-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <div className="w-8 h-8 rounded-full bg-green-900/50 flex items-center justify-center">
                <Truck size={16} className="text-green-400" />
              </div>
              <span>Free shipping on orders over $50</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center">
                <Shield size={16} className="text-blue-400" />
              </div>
              <span>Secure checkout with mock payment processing</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center">
                <Zap size={16} className="text-purple-400" />
              </div>
              <span>Injectable failure modes for demo scenarios</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(category => (
            <Link
              key={category}
              href={`/products?category=${encodeURIComponent(category)}`}
              className="group relative p-6 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl hover:border-indigo-500/50 hover:bg-[#1e1e2e] transition-all"
            >
              <div className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
                {category}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {category === 'Electronics' && '3 products'}
                {category === 'Clothing' && '3 products'}
                {category === 'Books' && '3 products'}
                {category === 'Home' && '3 products'}
              </div>
              <ArrowRight
                size={16}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Products</h2>
          <Link
            href="/products"
            className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 bg-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
