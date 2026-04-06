'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Package, CheckCircle } from 'lucide-react'
import { api, Product } from '@/lib/api'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAdding(true)
    setError('')
    try {
      await api.addToCart(product.id, 1)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch (err) {
      setError('Failed to add')
    } finally {
      setAdding(false)
    }
  }

  const inStock = product.stock_quantity > 0

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group bg-[#1a1a1a] border border-[#2e2e2e] hover:border-indigo-500/50 rounded-xl overflow-hidden transition-all hover:shadow-lg hover:shadow-indigo-900/20 cursor-pointer">
        {/* Image */}
        <div className="aspect-video bg-[#0f0f0f] relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700">
              <Package size={40} />
            </div>
          )}
          {!inStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="px-2 py-1 bg-gray-900 text-gray-400 text-xs rounded font-medium">
                Out of Stock
              </span>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-black/60 text-gray-300 text-xs rounded">
              {product.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-white text-sm mb-1 line-clamp-2 group-hover:text-indigo-300 transition-colors">
            {product.name}
          </h3>
          <p className="text-gray-500 text-xs line-clamp-2 mb-3">
            {product.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-indigo-400">
              ${Number(product.price).toFixed(2)}
            </span>

            <button
              onClick={handleAddToCart}
              disabled={adding || !inStock}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                added
                  ? 'bg-green-900/40 border border-green-700/50 text-green-400'
                  : inStock
                  ? 'bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 hover:bg-indigo-900/60'
                  : 'bg-[#0f0f0f] border border-[#2e2e2e] text-gray-600 cursor-not-allowed'
              }`}
            >
              {added ? (
                <>
                  <CheckCircle size={12} />
                  Added
                </>
              ) : (
                <>
                  <ShoppingCart size={12} />
                  {adding ? '...' : 'Add'}
                </>
              )}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      </div>
    </Link>
  )
}
