'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/useAuth'
import {
  ShoppingCart, Package, Loader2, ArrowLeft, ChevronRight, AlertTriangle,
  RefreshCw, FileText, Bike,
} from 'lucide-react'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'In progress' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Placed',
  PENDING_PAYMENT: 'Awaiting payment',
  RX_PENDING: 'Prescription check',
  RX_REJECTED: 'Prescription rejected',
  CONFIRMED: 'Confirmed',
  ACCEPTED: 'Accepted',
  PACKING: 'Packing',
  PACKED: 'Packed',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const ACTIVE = [
  'PENDING', 'PENDING_PAYMENT', 'RX_PENDING', 'CONFIRMED', 'ACCEPTED',
  'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY',
]

function matches(order: any, filter: string) {
  if (filter === 'ALL') return true
  if (filter === 'ACTIVE') return ACTIVE.includes(String(order.status))
  return String(order.status) === filter
}

function badgeClass(status: string) {
  if (status === 'DELIVERED') return 'border-green-400 bg-green-50 text-green-800'
  if (status === 'CANCELLED' || status === 'RX_REJECTED')
    return 'border-red-400 bg-red-50 text-red-800'
  return 'border-amber-400 bg-amber-50 text-amber-800'
}

export default function OrderHistoryPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load your orders')
      setOrders(data.orders || [])
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your orders')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    load()
  }, [load])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Sign in to see your orders</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Your order history and live tracking live behind sign-in.
            </p>
            <Button asChild>
              <Link href="/login?next=%2Forders">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const visible = orders.filter((o) => matches(o, filter))
  const activeCount = orders.filter((o) => ACTIVE.includes(String(o.status))).length

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Your orders</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/medicines">Browse</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        {activeCount > 0 && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <Bike className="h-4 w-4 text-primary" />
            <span>
              {activeCount} order{activeCount === 1 ? '' : 's'} on the way.
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setFilter('ACTIVE')}
            >
              Show
            </Button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                filter === f.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ShoppingCart className="mb-4 h-14 w-14 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">
                {orders.length === 0 ? 'No orders yet' : 'Nothing in this filter'}
              </h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                {orders.length === 0
                  ? 'Search a medicine or upload a prescription to place your first order.'
                  : 'Try a different filter to see the rest of your orders.'}
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/medicines">Browse medicines</Link>
                </Button>
                {orders.length > 0 && (
                  <Button variant="outline" onClick={() => setFilter('ALL')}>
                    Show all
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visible.map((order) => (
              <Card key={order.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <Link href={`/orders/${order.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString('en-IN')}
                          {order.pharmacyName ? ` · ${order.pharmacyName}` : ''}
                        </p>
                      </div>
                      <Badge className={badgeClass(String(order.status))}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Package className="h-3.5 w-3.5" />
                      {order.items?.length ?? 0} item
                      {order.items?.length === 1 ? '' : 's'}
                      {order.prescriptionId && (
                        <>
                          <span>·</span>
                          <FileText className="h-3.5 w-3.5" /> Prescription
                        </>
                      )}
                    </div>

                    <Separator className="my-3" />

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">₹{order.totalAmount}</p>
                        {order.paymentStatus && (
                          <p className="text-[11px] text-muted-foreground">
                            Payment: {order.paymentStatus}
                          </p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-sm font-medium text-primary">
                        {ACTIVE.includes(String(order.status))
                          ? 'Track live'
                          : order.status === 'DELIVERED'
                            ? 'Buy again'
                            : 'View'}
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>

                  {order.status === 'RX_REJECTED' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/prescriptions/upload">Upload a new prescription</Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href="/medicines">Order again</Link>
                      </Button>
                    </div>
                  )}

                  {order.status === 'PENDING_PAYMENT' && (
                    <div className="mt-3">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/orders/${order.id}?payment=failed`}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Retry payment
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
