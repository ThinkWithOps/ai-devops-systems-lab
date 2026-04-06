'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, ArrowLeft, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { api, Product } from '@/lib/api'
import { getSessionId } from '@/lib/api'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Number(params.id)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getProduct(productId)
      .then(setProduct)
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false))
  }, [productId])

  const handleAddToCart = async () => {
    if (!product) return
    setAdding(true)
    setError('')
    try {
      await api.addToCart(product.id, quantity)
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 2500)
    } catch (err: any) {
      setError('Failed to add to cart. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-[#1a1a1a] rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="h-96 bg-[#1a1a1a] rounded-xl" />
            <div className="space-y-4">
              <div className="h-8 bg-[#1a1a1a] rounded w-3/4" />
              <div className="h-6 bg-[#1a1a1a] rounded w-1/4" />
              <div className="h-24 bg-[#1a1a1a] rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-center">
        <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-white mb-2">Product Not Found</h2>
        <Link href="/products" className="text-indigo-400 hover:text-indigo-300">
          Back to products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden aspect-square flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-gray-600">
              <Package size={64} className="mx-auto mb-2" />
              <p className="text-sm">No image available</p>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs rounded-full">
              {product.category}
            </span>
            <span className="text-xs text-gray-600 font-mono">SKU: {product.sku}</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

          <div className="text-4xl font-bold text-indigo-400 mb-6">
            ${Number(product.price).toFixed(2)}
          </div>

          <p className="text-gray-300 text-base leading-relaxed mb-8">
            {product.description}
          </p>

          {/* Stock Status */}
          <div className="flex items-center gap-2 mb-6">
            {product.stock_quantity > 0 ? (
              <>
                <CheckCircle size={16} className="text-green-400" />
                <span className="text-green-400 text-sm">
                  In stock ({product.stock_quantity} available)
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-red-400 text-sm">Out of stock</span>
              </>
            )}
          </div>

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center border border-[#2e2e2e] rounded-lg overflow-hidden">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#242424] transition-colors"
              >
                -
              </button>
              <span className="px-4 py-2 text-white font-medium bg-[#1a1a1a] border-x border-[#2e2e2e]">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(q => Math.min(product.stock_quantity, q + 1))}
                className="px-3 py-2 text-gray-400 hover:text-white hover:bg-[#242424] transition-colors"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || product.stock_quantity === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-semibold text-white transition-all ${
                addedToCart
                  ? 'bg-green-600 hover:bg-green-600'
                  : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {addedToCart ? (
                <>
                  <CheckCircle size={18} />
                  Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  {adding ? 'Adding...' : 'Add to Cart'}
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}

          {/* Proceed to Cart */}
          {addedToCart && (
            <Link
              href="/cart"
              className="text-center mt-2 py-2 text-indigo-400 hover:text-indigo-300 text-sm border border-indigo-700/50 rounded-lg"
            >
              View Cart & Checkout
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
