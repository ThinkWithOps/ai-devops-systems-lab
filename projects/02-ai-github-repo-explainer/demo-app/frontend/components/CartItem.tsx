'use client'

import { Trash2, Package } from 'lucide-react'
import { CartItem } from '@/lib/api'

interface CartItemRowProps {
  item: CartItem
  onRemove: (itemId: number) => void
  onUpdateQuantity: (itemId: number, quantity: number) => void
}

export function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const subtotal = Number(item.product.price) * item.quantity

  return (
    <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-4">
      {/* Product Image */}
      <div className="w-16 h-16 flex-shrink-0 bg-[#0f0f0f] rounded-lg overflow-hidden">
        {item.product.image_url ? (
          <img
            src={item.product.image_url}
            alt={item.product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <Package size={24} />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white text-sm truncate">{item.product.name}</h3>
        <p className="text-gray-500 text-xs mt-0.5">{item.product.category}</p>
        <p className="text-indigo-400 text-sm font-semibold mt-1">
          ${Number(item.product.price).toFixed(2)} each
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-[#2e2e2e] rounded-lg overflow-hidden">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#242424] transition-colors text-sm"
          >
            -
          </button>
          <span className="w-8 text-center text-white text-sm bg-[#1a1a1a] border-x border-[#2e2e2e] py-1">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="w-7 h-7 text-gray-400 hover:text-white hover:bg-[#242424] transition-colors text-sm"
          >
            +
          </button>
        </div>

        <span className="w-16 text-right text-white font-semibold text-sm">
          ${subtotal.toFixed(2)}
        </span>

        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}
