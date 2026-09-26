'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/components/customer/cart-provider'
import {
  Loader2, MapPin, CreditCard, Bike, FileText, RefreshCw, ShoppingBag,
  CheckCircle2, AlertTriangle, Clock, XCircle, Receipt, ArrowLeft,
} from 'lucide-react'

const STEPS = [
  { key: 'RX_PENDING', label: 'Prescription check', hint: 'Pharmacist review' },
  { key: 'CONFIRMED', label: 'Order confirmed', hint: 'Pharmacy accepted' },
  { key: 'PACKED', label: 'Packed', hint: 'Being packed' },
  { key: 'READY_FOR_PICKUP', label: 'Ready', hint: 'Waiting for rider' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the way', hint: 'Rider en route' },
  { key: 'DELIVERED', label: 'Delivered', hint: 'Handed over' },
]

/**
 * Which progress step a status sits on.
 *
 * ACCEPTED and PACKING are not shown as their own circles, so they are folded
 * into the surrounding steps. Anything before fulfilment (a placed or unpaid
 * order) has no step yet and returns -1, which hides the bar.
 */
const STEP_FOR_STATUS: Record<string, number> = {
  RX_PENDING: 0,
  CONFIRMED: 1,
  ACCEPTED: 1,
  PACKING: 1,
  PACKED: 2,
  READY_FOR_PICKUP: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Placed',
  PENDING_PAYMENT: 'Awaiting payment',
  RX_PENDING: 'Prescription check',
  RX_REJECTED: 'Prescription rejected',
  CONFIRMED: 'Confirmed',
  ACCEPTED: 'Accepted by pharmacy',
  PACKING: 'Packing',
  PACKED: 'Packed',
  READY_FOR_PICKUP: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const TERMINAL = ['DELIVERED', 'CANCELLED', 'RX_REJECTED']
const CANCELLABLE = [
  'PENDING', 'PENDING_PAYMENT', 'RX_PENDING', 'CONFIRMED', 'ACCEPTED', 'PACKING',
]

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <OrderDetail />
    </Suspense>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const router = useRouter()
  const { replaceAll } = useCart()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelMsg, setCancelMsg] = useState('')
  const [retrying, setRetrying] = useState(false)

  const placed = params.get('placed') === '1'
  const paymentFailed = params.get('payment') === 'failed'

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${id}/tracking`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load this order')
      setData(json)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this order')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  // Live-update while the order is still moving.
  useEffect(() => {
    if (!data || TERMINAL.includes(data.order.status)) return
    const timer = setInterval(load, 15000)
    return () => clearInterval(timer)
  }, [data, load])

  async function cancelOrder() {
    if (!confirm('Cancel this order? Reserved items go back to stock.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by customer' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not cancel')
      setCancelMsg(json.message)
      load()
    } catch (err) {
      setCancelMsg(err instanceof Error ? err.message : 'Could not cancel')
    } finally {
      setCancelling(false)
    }
  }

  async function retryPayment() {
    setRetrying(true)
    try {
      const res = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not restart payment')
      setCancelMsg('Payment reopened. Use the Pay button to try again.')
      load()
    } catch (err) {
      setCancelMsg(err instanceof Error ? err.message : 'Could not restart payment')
    } finally {
      setRetrying(false)
    }
  }

  async function reorder() {
    setCancelMsg('')
    const res = await fetch(`/api/orders/${id}/reorder`)
    const json = await res.json()
    if (!res.ok) {
      setCancelMsg(json.error || 'Could not rebuild your cart')
      return
    }
    const usable = (json.items || []).filter((i: any) => i.available)
    if (usable.length === 0) {
      setCancelMsg('None of these medicines are available right now.')
      return
    }
    replaceAll(
      usable.map((i: any) => ({
        medicineId: i.medicineId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        requiresPrescription: i.requiresPrescription,
      }))
    )
    if (json.unavailable?.length) {
      sessionStorage.setItem(
        'reorderSkipped',
        json.unavailable.map((i: any) => i.name).join(', ')
      )
    }
    router.push('/cart')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <XCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Order not available</h1>
            <p className="mb-6 text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={load}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
              <Button asChild>
                <Link href="/orders">My orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const order = data.order
  const status = String(order.status)
  const isCancelled = status === 'CANCELLED'
  const isRejected = status === 'RX_REJECTED'
  const isDelivered = status === 'DELIVERED'
  const awaitingPayment = status === 'PENDING_PAYMENT'
  const paid = data.payment?.status === 'COMPLETED'
  const showOtp = data.delivery?.otpRequired && data.delivery?.otp

  const progressStep = STEP_FOR_STATUS[status] ?? -1

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orders">
              <ArrowLeft className="mr-2 h-4 w-4" /> Orders
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{order.orderNumber}</h1>
            <p className="text-xs text-muted-foreground">
              Placed {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
          <Badge
            className={
              isCancelled || isRejected
                ? 'border-red-400 bg-red-50 text-red-800'
                : isDelivered
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : 'border-amber-400 bg-amber-50 text-amber-800'
            }
          >
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl space-y-4 px-4 py-6">
        {placed && (
          <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            <div>
              <p className="font-medium text-green-900">Order placed</p>
              <p className="text-sm text-green-800">
                We have it. You will get an SMS at every status change.
              </p>
            </div>
          </div>
        )}

        {paymentFailed && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Payment did not go through</p>
              <p className="text-sm text-amber-800">
                Nothing was charged and your items are still held for 15 minutes.
              </p>
              <Button
                size="sm"
                className="mt-2"
                onClick={retryPayment}
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Retry payment
              </Button>
            </div>
          </div>
        )}

        {showOtp && (
          <Card className="border-primary">
            <CardContent className="p-5 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Give this code to your rider
              </p>
              <p className="my-3 font-mono text-4xl font-bold tracking-[0.3em]">
                {data.delivery.otp}
              </p>
              <p className="text-xs text-muted-foreground">
                Only share it with the rider carrying your order.
              </p>
            </CardContent>
          </Card>
        )}

        {cancelMsg && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">{cancelMsg}</div>
        )}

        {!isCancelled && !isRejected && progressStep >= 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2">
                {STEPS.map((step, i) => (
                  <div key={step.key} className="flex flex-1 items-center gap-2">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                          i < progressStep
                            ? 'bg-primary text-primary-foreground'
                            : i === progressStep
                              ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {i < progressStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className="mt-1 hidden text-center text-[10px] leading-tight sm:block">
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          i < progressStep ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {!TERMINAL.includes(status) && (
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Typical delivery in 30–60
                  minutes after confirmation.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Delivering to
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.deliveryAddress.label}</p>
              <p className="mt-1 text-muted-foreground">{order.deliveryAddress.address}</p>
              {order.deliveryAddress.landmark && (
                <p className="text-muted-foreground">
                  Near {order.deliveryAddress.landmark}
                </p>
              )}
              <p className="mt-1 font-medium">{order.deliveryAddress.pincode}</p>
              {order.pharmacyName && (
                <>
                  <Separator className="my-3" />
                  <p className="text-xs text-muted-foreground">Fulfilled by</p>
                  <p className="font-medium">{order.pharmacyName}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" /> Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={
                    data.payment?.status === 'COMPLETED'
                      ? 'font-medium text-green-700'
                      : data.payment?.status === 'REFUNDED'
                        ? 'font-medium text-blue-700'
                        : 'font-medium text-amber-700'
                  }
                >
                  {data.payment?.status ?? 'PENDING'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">₹{data.payment?.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>{Number(order.deliveryFee) === 0 ? 'FREE' : `₹${order.deliveryFee}`}</span>
              </div>
              {data.payment?.status === 'REFUNDED' && (
                <p className="rounded-md bg-blue-50 p-2 text-xs text-blue-800">
                  Refunded to your original payment method in 3–5 business days.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="h-4 w-4" /> Items ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × ₹{item.price}
                    {item.requiresPrescription && ' · Prescription required'}
                  </p>
                </div>
                <p className="shrink-0 font-medium">
                  ₹{Number(item.price) * item.quantity}
                </p>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>₹{order.totalAmount}</span>
            </div>
            {order.prescriptionId && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Prescription attached to this order
              </p>
            )}
          </CardContent>
        </Card>

        {data.rider && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bike className="h-4 w-4" /> Your rider
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{data.rider.name}</p>
              <p className="text-xs text-muted-foreground">
                {data.rider.vehicleType} · {data.rider.licensePlate}
              </p>
              {data.rider.currentLat != null && (
                <a
                  className="mt-2 inline-block text-xs text-primary underline"
                  href={`https://www.openstreetmap.org/?mlat=${data.rider.currentLat}&mlon=${data.rider.currentLng}#map=16/${data.rider.currentLat}/${data.rider.currentLng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View live location on map
                </a>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {data.timeline.map((event: any, idx: number) => (
                <li key={event.id ?? idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    {idx < data.timeline.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium">
                      {STATUS_LABEL[event.status] ?? event.status}
                    </p>
                    {event.notes && (
                      <p className="text-xs text-muted-foreground">{event.notes}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {!TERMINAL.includes(status) && CANCELLABLE.includes(status) && (
            <Button variant="outline" onClick={cancelOrder} disabled={cancelling}>
              {cancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel order
            </Button>
          )}
          {!TERMINAL.includes(status) && (
            <Button variant="outline" onClick={load}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          )}
          {isDelivered && (
            <>
              <Button onClick={reorder}>
                <ShoppingBag className="mr-2 h-4 w-4" /> Buy it again
              </Button>
              <Button variant="outline" asChild>
                <Link href="/medicines">Browse medicines</Link>
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
