'use client'

import { useEffect, useState, useCallback } from 'react'
import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Zap, BarChart3, ShoppingBag, DollarSign, Package, Loader2 } from 'lucide-react'
import { FailureToggle } from '@/components/FailureToggle'
import StatusBadge from '@/components/StatusBadge'
import { api } from '@/lib/api'

interface FailureMode {
  active: boolean
  description: string
  service: string
  impact: string
}

interface Stats {
  payments: {
    total_payments: number
    successful_payments: number
    failed_payments: number
    pending_payments: number
    success_rate: number
    total_revenue: number
  }
  orders: {
    by_status: Record<string, { count: number; revenue: number }>
    total_orders: number
  }
  inventory: {
    total_products: number
    critical_stock: number
    low_stock: number
    products: Array<{
      product_id: number
      name: string
      sku: string
      category: string
      stock_quantity: number
      status: string
    }>
  }
  failures: {
    active_count: number
    active_modes: string[]
  }
}

export default function OperatorPage() {
  const [failures, setFailures] = useState<Record<string, FailureMode>>({})
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [health, setHealth] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchAll = useCallback(async () => {
    try {
      const [failureData, statsData, ordersData, healthData] = await Promise.all([
        api.getFailures(),
        api.getStats(),
        api.getAdminOrders(),
        api.getHealth(),
      ])
      setFailures(failureData.failures)
      setStats(statsData)
      setRecentOrders(ordersData.orders.slice(0, 10))
      setHealth(healthData)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Failed to fetch operator data', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleToggleFailure = async (mode: string, currentlyActive: boolean) => {
    try {
      if (currentlyActive) {
        await api.disableFailure(mode)
      } else {
        await api.enableFailure(mode)
      }
      await fetchAll()
    } catch (err) {
      console.error('Failed to toggle failure mode', err)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seedData()
      await fetchAll()
    } catch (err) {
      console.error('Seed failed', err)
    } finally {
      setSeeding(false)
    }
  }

  const activeFailureCount = Object.values(failures).filter(f => f.active).length

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[#1a1a1a] rounded w-64" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-[#1a1a1a] rounded-xl" />)}
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-[#1a1a1a] rounded-xl" />
            <div className="h-64 bg-[#1a1a1a] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Activity size={28} className="text-indigo-400" />
            Operator Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            ShopFlow — Service health, failure injection &amp; live stats
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeFailureCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 border border-red-700/50 rounded-full text-red-400 text-sm">
              <AlertTriangle size={14} />
              {activeFailureCount} active failure{activeFailureCount > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2e2e2e] hover:border-indigo-500/50 text-gray-400 hover:text-white rounded-lg text-sm transition-all"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-900/40 border border-indigo-700/50 hover:bg-indigo-900/60 text-indigo-300 rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
            Seed Data
          </button>
        </div>
      </div>

      {/* Service Health */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { name: 'Backend API', key: 'status', statusObj: health },
          { name: 'PostgreSQL', key: 'postgres', statusObj: health?.checks },
          { name: 'Redis', key: 'redis', statusObj: health?.checks },
        ].map(service => {
          const status = service.statusObj?.[service.key]
          const isConnected = typeof status === 'object'
            ? status?.status === 'connected'
            : status === 'healthy'
          return (
            <div key={service.name} className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-4 flex items-center gap-3">
              {isConnected
                ? <CheckCircle size={20} className="text-green-400" />
                : <XCircle size={20} className="text-red-400" />
              }
              <div>
                <div className="text-sm font-medium text-white">{service.name}</div>
                <div className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                  {isConnected ? 'Connected' : 'Error'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <ShoppingBag size={14} />
              Total Orders
            </div>
            <div className="text-3xl font-bold text-white">{stats.orders.total_orders}</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <DollarSign size={14} />
              Revenue
            </div>
            <div className="text-3xl font-bold text-green-400">
              ${stats.payments.total_revenue.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <BarChart3 size={14} />
              Payment Success Rate
            </div>
            <div className={`text-3xl font-bold ${stats.payments.success_rate >= 80 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.payments.success_rate}%
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Package size={14} />
              Low Stock Products
            </div>
            <div className={`text-3xl font-bold ${stats.inventory.critical_stock > 0 ? 'text-red-400' : stats.inventory.low_stock > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {stats.inventory.critical_stock + stats.inventory.low_stock}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Failure Injection Panel */}
        <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            <h2 className="font-semibold text-white">Failure Injection</h2>
            {activeFailureCount > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-red-900/40 border border-red-700/40 text-red-400 text-xs rounded-full">
                {activeFailureCount} active
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(failures).map(([mode, info]) => (
              <FailureToggle
                key={mode}
                mode={mode}
                active={info.active}
                description={info.description}
                service={info.service}
                impact={info.impact}
                onToggle={handleToggleFailure}
              />
            ))}
          </div>
        </div>

        {/* Payment Stats */}
        {stats && (
          <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center gap-2">
              <DollarSign size={16} className="text-green-400" />
              <h2 className="font-semibold text-white">Payment Stats</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Total Payments', value: stats.payments.total_payments, color: 'text-white' },
                { label: 'Successful', value: stats.payments.successful_payments, color: 'text-green-400' },
                { label: 'Failed', value: stats.payments.failed_payments, color: 'text-red-400' },
                { label: 'Pending', value: stats.payments.pending_payments, color: 'text-yellow-400' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className={`font-bold text-lg ${item.color}`}>{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[#2e2e2e]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Success Rate</span>
                  <span className={`font-bold text-xl ${stats.payments.success_rate >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.payments.success_rate}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-[#0f0f0f] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stats.payments.success_rate >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${stats.payments.success_rate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Orders Table */}
      <div className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center gap-2">
          <ShoppingBag size={16} className="text-indigo-400" />
          <h2 className="font-semibold text-white">Recent Orders</h2>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ShoppingBag size={32} className="mx-auto mb-2" />
            <p>No orders yet. Place an order to see it here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2e2e2e] text-gray-500">
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2e2e2e]">
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-[#1e1e1e] transition-colors">
                    <td className="px-4 py-3 text-indigo-400 font-mono">#{order.id}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400">{order.items_count}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">
                      ${Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        Auto-refreshes every 15s — Last updated: {lastRefresh.toLocaleTimeString()}
      </p>
    </div>
  )
}
