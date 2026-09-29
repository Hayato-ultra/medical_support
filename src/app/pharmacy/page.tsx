'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Store, ShoppingCart, Package, CheckCircle, AlertCircle,
  Loader2, FileText, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/** Standard decline reasons, so the reason is comparable across pharmacies. */
const REJECT_REASONS = [
  'Out of stock',
  'Pharmacist unavailable',
  'Store closing',
  'Too far to deliver',
  'Prescription cannot be dispensed',
  'Other',
]

/** The single next thing a pharmacy should press, per order status. */
const NEXT_ACTION: Record<string, { status: string; label: string } | undefined> = {
  CONFIRMED: { status: 'ACCEPTED', label: 'Accept order' },
  ACCEPTED: { status: 'PACKING', label: 'Start packing' },
  PACKING: { status: 'PACKED', label: 'Mark packed' },
}

const ACTIVE = [
  'CONFIRMED', 'ACCEPTED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY',
]

export default function PharmacyPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [reason, setReason] = useState(REJECT_REASONS[0])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  const fetchData = useCallback(async () => {
    try {
      // Both routes are session-scoped server side: a pharmacy only ever gets
      // its own orders and the prescriptions attached to them.
      const [ordersRes, rxRes, meRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/prescriptions'),
        fetch('/api/pharmacies/me'),
      ])
      const ordersData = await ordersRes.json()
      const rxData = await rxRes.json()
      const meData = await meRes.json().catch(() => ({}))
      setOrders(ordersData.orders || [])
      setPrescriptions(rxData.prescriptions || [])
      setSettings(meData.pharmacy ?? null)
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /** Stand down for prescriptions without going fully inactive. */
  const toggleRxPause = async () => {
    if (!settings) return
    setSavingSettings(true)
    setError('')
    try {
      const res = await fetch('/api/pharmacies/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rxPaused: !settings.rxPaused }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not update settings')
      setSettings(data.pharmacy)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update settings')
    } finally {
      setSavingSettings(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) fetchData()
  }, [isAuthenticated, fetchData])

  const move = async (orderId: string, status: string, notes?: string) => {
    setError('')
    setBusyId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not update the order')
      }
      setRejectingId('')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order')
    } finally {
      setBusyId('')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const active = orders.filter((o: any) => ACTIVE.includes(String(o.status)))
  const done = orders.filter((o: any) => ['DELIVERED', 'CANCELLED', 'RX_REJECTED'].includes(String(o.status)))
  const rxById = new Map(prescriptions.map((p: any) => [p.id, p]))

  const stats = [
    { label: 'Needs action', value: String(orders.filter((o: any) => o.status === 'CONFIRMED').length), change: 'Accept or decline', icon: ShoppingCart, color: 'text-yellow-600' },
    { label: 'In progress', value: String(active.length), change: 'Being prepared', icon: Package, color: 'text-blue-600' },
    { label: 'Awaiting rider', value: String(orders.filter((o: any) => o.status === 'PACKED').length), change: 'Picked up next', icon: AlertCircle, color: 'text-purple-600' },
    { label: 'Delivered', value: String(done.filter((o: any) => o.status === 'DELIVERED').length), change: 'Completed', icon: CheckCircle, color: 'text-green-600' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold tracking-tight">Mediconnect</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700">Pharmacy</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-8 max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <Store className="h-8 w-8 text-green-600" />
          <div className="mr-auto">
            <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
            <p className="text-muted-foreground">Accept orders, check the prescription, then pack for pickup</p>
          </div>

          {settings && (
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
              {settings.licenseExpiry && new Date(settings.licenseExpiry) <= new Date() && (
                <Badge variant="outline" className="border-red-400 bg-red-50 text-red-700">
                  Licence expired
                </Badge>
              )}
              <div>
                <p className="text-xs font-medium">No pharmacist on duty</p>
                <p className="text-[11px] text-muted-foreground">
                  {settings.rxPaused
                    ? 'New prescription orders go to another store'
                    : 'You are receiving prescription orders'}
                </p>
              </div>
              <Button
                variant={settings.rxPaused ? 'default' : 'outline'}
                size="sm"
                disabled={savingSettings}
                onClick={toggleRxPause}
              >
                {savingSettings ? 'Saving…' : settings.rxPaused ? 'Resume' : 'Pause'}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const StatIcon = stat.icon
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <StatIcon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {error && (
          <div className="mb-6 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Separator className="mb-8" />

        <h2 className="text-xl font-bold mb-4">Live order board</h2>

        {active.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No open orders. New prepaid orders land here automatically.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {active.map((o: any) => {
              const action = NEXT_ACTION[String(o.status)]
              const rx = o.prescriptionId ? rxById.get(o.prescriptionId) : null
              const isRejecting = rejectingId === o.id
              const busy = busyId === o.id
              return (
                <Card key={o.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{o.orderNumber}</span>
                        <Badge
                          variant={o.paymentStatus === 'COMPLETED' ? 'default' : 'secondary'}
                        >
                          {o.paymentStatus === 'COMPLETED' ? 'Prepaid' : 'Payment pending'}
                        </Badge>
                        <Badge variant="outline">{String(o.status).replace(/_/g, ' ')}</Badge>
                      </div>
                      <span className="font-semibold">
                        {'₹'}{String(o.totalAmount)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-1 text-sm">
                      {(o.items || []).map((it: any, i: number) => (
                        <li key={i} className="flex justify-between">
                          <span>
                            {it.quantity} × {it.medicineId?.slice(0, 8) || 'item'}
                          </span>
                          <span className="text-muted-foreground">
                            {'₹'}{String(it.price)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {o.prescriptionId ? (
                      rx ? (
                        <div className="flex flex-wrap items-center gap-2 rounded border bg-muted/40 px-3 py-2 text-sm">
                          <FileText className="h-4 w-4 text-primary" />
                          <span>
                            Prescription attached · {rx.status}
                            {rx.doctorName && rx.doctorName !== 'Not recorded'
                              ? ` · ${rx.doctorName}`
                              : ''}
                          </span>
                          {rx.imageUrl ? (
                            <a
                              href={rx.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-auto inline-flex items-center gap-1 text-primary underline"
                            >
                              View prescription
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="ml-auto text-xs text-muted-foreground">
                              Image not available
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          A prescription is attached to this order but the image
                          is not available. Do not dispense until you can see it.
                        </p>
                      )
                    ) : null}

                    {isRejecting ? (
                      <div className="space-y-2 rounded border border-destructive/40 p-3">
                        <label className="text-sm font-medium">
                          Why are you declining this order?
                        </label>
                        <select
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        >
                          {REJECT_REASONS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Declining cancels the order and refunds the customer. It
                          does not move the order to another pharmacy yet.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() => move(o.id, 'CANCELLED', reason)}
                          >
                            {busy ? 'Working...' : 'Confirm decline'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRejectingId('')}
                          >
                            Keep order
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {action && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() => move(o.id, action.status)}
                          >
                            {busy ? 'Working...' : action.label}
                          </Button>
                        )}
                        {['CONFIRMED', 'ACCEPTED', 'PACKING'].includes(String(o.status)) && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => { setRejectingId(o.id); setError('') }}
                          >
                            Decline
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {done.length > 0 && (
          <>
            <Separator className="my-8" />
            <h2 className="text-xl font-bold mb-4">Recently closed</h2>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {done.slice(0, 15).map((o: any) => (
                    <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="font-medium">{o.orderNumber}</span>
                      <span className="text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      <Badge variant="outline">{String(o.status).replace(/_/g, ' ')}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
