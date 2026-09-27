'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Truck, MapPin, Clock, CheckCircle, AlertCircle, Loader2 as LoaderIcon, User, MapPin as MapPinIcon, Phone, MessageSquare, Filter, RefreshCw, AlertTriangle } from 'lucide-react'

const ORDER_STATUS_COLORS: Record<string, string> = {
  RX_PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-300',
  PACKING: 'bg-purple-100 text-purple-800 border-purple-300',
  PACKED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  READY_FOR_PICKUP: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800 border-orange-300',
  DELIVERED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300',
  RX_REJECTED: 'bg-red-100 text-red-800 border-red-300',
}

const ACTIVE_STATUSES = ['RX_PENDING', 'CONFIRMED', 'ACCEPTED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']

export default function LiveOrdersPage() {
  const { isLoading: authLoading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [action, setAction] = useState<'assign' | 'update_status' | null>(null)
  const [selectedRider, setSelectedRider] = useState('')
  const [riders, setRiders] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'OUT_FOR_DELIVERY'>('ACTIVE')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ active: 0, pending: 0, outForDelivery: 0, delivered: 0, stuck: 0 })
  const [submitting, setSubmitting] = useState(false)

  async function fetchOrders() {
    try {
      setLoading(true)
      let url = `/api/admin/orders?status=${statusFilter === 'ALL' ? '' : statusFilter}`
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load orders')
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function fetchStats() {
    try {
      const [allRes, activeRes, pendingRes, outRes, deliveredRes] = await Promise.all([
        fetch('/api/admin/orders?status=ALL'),
        fetch('/api/admin/orders?status=ACTIVE'),
        fetch('/api/admin/orders?status=PENDING'),
        fetch('/api/admin/orders?status=OUT_FOR_DELIVERY'),
        fetch('/api/admin/orders?status=DELIVERED'),
      ])
      const allData = await allRes.json()
      const activeData = await activeRes.json()
      const pendingData = await pendingRes.json()
      const outData = await outRes.json()
      const deliveredData = await deliveredRes.json()

      const activeOrders = activeData.orders || []
      const stuck = activeOrders.filter((o: any) =>
        ACTIVE_STATUSES.includes(o.status) &&
        new Date(o.createdAt).getTime() < Date.now() - 30 * 60000
      ).length

      setStats({
        active: activeData.orders?.length ?? 0,
        pending: pendingData.orders?.length ?? 0,
        outForDelivery: outData.orders?.length ?? 0,
        delivered: deliveredData.orders?.length ?? 0,
        stuck,
      })
    } catch {}
  }

  async function fetchRiders() {
    try {
      const res = await fetch('/api/admin/riders')
      const data = await res.json()
      if (res.ok) setRiders(data.riders || [])
    } catch {}
  }

  async function handleAction() {
    if (!selectedOrder) return
    if (action === 'assign' && !selectedRider) {
      setError('Please select a rider')
      return
    }

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/${action === 'assign' ? 'assign-rider' : 'update-status'}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: selectedRider }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setSelectedOrder(null)
      setAction(null)
      setSelectedRider('')
      await fetchOrders()
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  function formatAge(createdAt: string) {
    const ms = Date.now() - new Date(createdAt).getTime()
    const min = Math.floor(ms / 60000)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ${min % 60}m ago`
    const days = Math.floor(hr / 24)
    return `${days}d ${hr % 24}h ago`
  }

  function formatStatus(status: string) {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Live Orders</h1>
              <p className="text-muted-foreground">Track and manage active deliveries in real-time.</p>
            </div>
          </div>
          {stats.stuck > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              ⚠ {stats.stuck} Stuck &gt; 30min
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setRefreshing(true); fetchOrders(); fetchStats(); }} disabled={refreshing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Out for Delivery</p>
                <p className="text-2xl font-bold text-orange-600">{stats.outForDelivery}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stuck &gt; 30min</p>
                <p className="text-2xl font-bold text-red-600">{stats.stuck}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search order #, customer, pharmacy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Orders</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                  <SelectItem value="DELIVERY">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { fetchOrders(); fetchStats(); }} disabled={refreshing}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Live Orders ({orders.length})</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Active</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Out for Delivery</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Stuck</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Truck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="space-y-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Order</th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Pharmacy</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Rider</th>
                    <th className="px-4 py-3 text-left font-medium">Age</th>
                    <th className="px-4 py-3 text-left font-medium">Delivery Address</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter((o: any) => {
                      if (statusFilter !== 'ALL' && statusFilter !== 'ACTIVE' && o.status !== statusFilter) return false
                      if (statusFilter === 'ACTIVE' && !ACTIVE_STATUSES.includes(o.status)) return false
                      if (searchQuery && !o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) &&
                          !o.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) &&
                          !o.pharmacyName?.toLowerCase().includes(searchQuery.toLowerCase())) return false
                      return true
                    })
                    .map((order: any) => (
                      <tr key={order.id} className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', ACTIVE_STATUSES.includes(order.status) && new Date(order.createdAt).getTime() < Date.now() - 30 * 60000 ? 'bg-red-50' : '')}>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">#{order.orderNumber || order.id.slice(0, 8)}</p>
                            <Badge variant="outline" className={ORDER_STATUS_COLORS[order.status] || ''}>
                              {formatStatus(order.status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{order.customerId?.slice(0, 8) ?? '&mdash;'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-medium">{order.pharmacyName ?? '&mdash;'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={ORDER_STATUS_COLORS[order.status] || ''}>
                            {formatStatus(order.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          {order.riderName ? (
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span>{order.riderName}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className={cn('flex items-center gap-1', ACTIVE_STATUSES.includes(order.status) && new Date(order.createdAt).getTime() < Date.now() - 30 * 60000 ? 'text-red-600 font-medium' : '')}>
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{formatAge(order.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="max-w-xs truncate text-muted-foreground text-xs">
                            {order.deliveryAddress?.address ?? '&mdash;'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {ACTIVE_STATUSES.includes(order.status) && !order.riderId && (
                              <Dialog open={selectedOrder?.id === order.id && action === 'assign'} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setAction(null); setSelectedRider(''); } }}>
                                <DialogTrigger asChild>
                                  <Button variant="default" size="sm" onClick={() => { setSelectedOrder(order); setAction('assign'); }}>Assign Rider</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Assign Rider to #{order.orderNumber?.slice(0, 8) || order.id.slice(0, 8)}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                      <Label className="font-medium">Select Rider</Label>
                                      <Select value={selectedRider} onValueChange={(v) => setSelectedRider(v)}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a rider..." />
                        </SelectTrigger>
                        <SelectContent>
                          {riders.map((r: any) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name} ({r.vehicleType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                                      {riders.length === 0 && <p className="text-sm text-muted-foreground">No available riders</p>}
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => { setSelectedOrder(null); setAction(null); setSelectedRider(''); }}>Cancel</Button>
                                    <Button onClick={handleAction} disabled={!selectedRider || submitting}>
                                      {submitting ? 'Assigning…' : 'Assign Rider'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                            {order.riderId && ACTIVE_STATUSES.includes(order.status) && (
                              <Dialog open={selectedOrder?.id === order.id && action === 'update_status'} onOpenChange={(open) => { if (!open) { setSelectedOrder(null); setAction(null); } }}>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => { setSelectedOrder(order); setAction('update_status'); }}>Update Status</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Update Order Status</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                      <Label className="font-medium">New Status</Label>
                                      <Select value={selectedRider} onValueChange={(v) => setSelectedRider(v)}>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select new status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVE_STATUSES.filter(s => s !== order.status).map((s) => (
                            <SelectItem key={s} value={s}>{formatStatus(s)}</SelectItem>
                          ))}
                          <SelectItem value="DELIVERED">Delivered</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => { setSelectedOrder(null); setAction(null); }}>Cancel</Button>
                                    <Button onClick={handleAction} disabled={!selectedRider || submitting}>
                                      {submitting ? 'Updating…' : 'Update Status'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <a href={`/admin/orders/${order.id}`} target="_blank">
                                <MessageSquare className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
</Card>
    </div>
  )
}


