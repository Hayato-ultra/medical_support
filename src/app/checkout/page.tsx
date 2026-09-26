'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/components/customer/cart-provider'
import { useAuth } from '@/hooks/useAuth'
import {
  MapPin, Pill, Loader2, CheckCircle2, AlertTriangle, ArrowLeft,
  ShieldCheck, CreditCard, MapPinned, BellRing,
} from 'lucide-react'

type Serviceable = {
  state: 'idle' | 'checking' | 'ok' | 'fail'
  message?: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const {
    items, itemCount, total, deliveryFee, grandTotal,
    hasPrescriptionItems, clearCart,
  } = useCart()

  const [label, setLabel] = useState('Home')
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [pincode, setPincode] = useState('')
  const [notes, setNotes] = useState('')
  const [serviceable, setServiceable] = useState<Serviceable>({ state: 'idle' })
  const [notifyPhone, setNotifyPhone] = useState('')
  const [notified, setNotified] = useState(false)
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  const [step, setStep] = useState<'address' | 'rx' | 'pay'>('address')
  const [submitting, setSubmitting] = useState(false)
  const [paymentStage, setPaymentStage] = useState<'idle' | 'processing'>('idle')
  const [error, setError] = useState('')
  const [pharmacyId, setPharmacyId] = useState<string | null>(null)

  // Lines that can be sold without a prescription, used by the
  // "continue without prescription" path.
  const otcItems = items.filter((i) => !i.requiresPrescription)
  const hasOtcItems = otcItems.length > 0

  // The prescription medicines, named so the prompt says which items caused it.
  const rxItems = items.filter((i) => i.requiresPrescription)
  const rxNames = rxItems.map((i) => i.name).join(', ')

  // The prescription step exists only when the cart actually contains
  // prescription medicines. An all-over-the-counter cart goes straight from
  // address to payment and is never asked for a prescription.
  const needsRxStep = hasPrescriptionItems
  const steps = [
    { key: 'address' as const, label: 'Delivery address' },
    ...(needsRxStep ? [{ key: 'rx' as const, label: 'Prescription' }] : []),
    { key: 'pay' as const, label: 'Payment' },
  ]

  // Pick up a prescription chosen on the upload or library page, then skip
  // past the step it satisfies.
  useEffect(() => {
    const stored = sessionStorage.getItem('prescriptionId')
    if (stored) {
      setPrescriptionId(stored)
      sessionStorage.removeItem('prescriptionId')
      setStep((s) => (s === 'rx' ? 'pay' : s))
    }
  }, [])

  useEffect(() => {
    fetch('/api/pharmacies')
      .then((r) => (r.ok ? r.json() : { pharmacies: [] }))
      .then((data) => {
        const list = data.pharmacies || []
        if (list.length > 0) setPharmacyId(list[0].id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isAuthenticated && user?.phone) {
      setNotifyPhone(user.phone)
    }
  }, [isAuthenticated, user])

  const addressValid =
    address.trim().length > 5 && /^\d{6}$/.test(pincode) && serviceable.state === 'ok'

  async function checkPincode(value: string) {
    setPincode(value)
    if (!/^\d{6}$/.test(value)) {
      setServiceable({ state: 'idle' })
      return
    }
    setServiceable({ state: 'checking' })
    try {
      const res = await fetch(`/api/serviceability?pincode=${value}`)
      const data = await res.json()
      setServiceable(
        data.serviceable
          ? { state: 'ok', message: data.message }
          : { state: 'fail', message: data.message }
      )
    } catch {
      setServiceable({ state: 'idle' })
    }
  }

  async function joinWaitlist() {
    await fetch('/api/serviceability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode, phone: notifyPhone }),
    })
    setNotified(true)
  }

  /**
   * Places the order.
   *
   * `orderItems` defaults to the whole cart. "Place order without prescription"
   * passes only the over-the-counter lines, so the prescription medicines are
   * dropped from this order instead of blocking it.
   */
  async function placeOrder(orderItems = items) {
    setSubmitting(true)
    setError('')
    try {
      if (orderItems.length === 0) {
        throw new Error('Your cart is empty')
      }
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: pharmacyId || undefined,
          items: orderItems.map((i) => ({
            medicineId: i.medicineId,
            quantity: i.quantity,
          })),
          deliveryAddress: { label, address, landmark, pincode },
          prescriptionId: prescriptionId || undefined,
          notes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'PRESCRIPTION_REQUIRED') {
          if (needsRxStep) setStep('rx')
          setError(data.message)
          return
        }
        if (data.error === 'PRESCRIPTION_NOT_USABLE' || data.error === 'PRESCRIPTION_IN_USE') {
          // The saved prescription cannot clear this order, so send the customer
          // back to upload a fresh one rather than leaving them stuck.
          if (needsRxStep) setStep('rx')
          setError(data.message)
          return
        }
        if (data.error === 'OUTSIDE_SERVICE_AREA') {
          throw new Error(data.message)
        }
        if (data.error === 'INSUFFICIENT_STOCK' || data.error === 'OUT_OF_STOCK') {
          throw new Error(data.message)
        }
        throw new Error(data.error || 'Could not place order')
      }

      const intentRes = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.order.id }),
      })
      const intent = await intentRes.json()
      if (!intentRes.ok) throw new Error(intent.error || 'Could not start payment')

      // Stand-in for the Razorpay checkout dialog. In production the browser
      // opens Razorpay here and the gateway calls /api/payments/webhook.
      setPaymentStage('processing')
      const paid = true

      const webhookRes = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            notes: { orderId: data.order.id },
            status: paid ? 'captured' : 'failed',
            method: 'upi',
            payment_entity: { id: intent.intentId },
          },
        }),
      })
      const webhook = await webhookRes.json()

      if (!webhookRes.ok) {
        // The order exists and is awaiting payment, so the cart stays intact
        // and the customer can retry from the order page.
        throw new Error(webhook.error || 'Payment could not be confirmed')
      }

      clearCart()
      setPaymentStage('idle')

      router.push(`/orders/${data.order.id}?placed=1`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order')
      setPaymentStage('idle')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <ShieldCheck className="mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Sign in to checkout</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We only ask for sign-in at this step, not before you start browsing.
            </p>
            <Button asChild>
              <Link href="/login?next=%2Fcheckout">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/cart">
              <ArrowLeft className="mr-2 h-4 w-4" /> Cart
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Checkout</h1>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 py-6">
        <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step === s.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
              <span className={step === s.key ? 'font-medium' : 'text-muted-foreground'}>
                {s.label}
                {s.key === 'rx' && (
                  <span className="ml-1 text-xs text-amber-700">(needed)</span>
                )}
              </span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {step === 'address' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" /> Delivery address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="label">Save as</Label>
                  <div className="mt-1 flex gap-2">
                    {['Home', 'Work', 'Other'].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLabel(l)}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          label === l ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Full address</Label>
                  <Textarea
                    id="address"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Flat / house no, building, street, area"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="landmark">Landmark (optional)</Label>
                  <Input
                    id="landmark"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near the temple"
                    className="mt-1"
                  />
                </div>

                <div className="max-w-[200px]">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    inputMode="numeric"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => checkPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="452001"
                    className="mt-1"
                  />

                  {serviceable.state === 'checking' && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking if we deliver here…
                    </p>
                  )}

                  {serviceable.state === 'ok' && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {serviceable.message}
                    </p>
                  )}

                  {serviceable.state === 'fail' && (
                    <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                      <p className="flex items-start gap-2 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {serviceable.message}
                      </p>
                      {notified ? (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> You are on the list
                        </p>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <Input
                            value={notifyPhone}
                            onChange={(e) => setNotifyPhone(e.target.value)}
                            placeholder="Mobile number"
                            className="h-8 text-xs"
                          />
                          <Button size="sm" variant="outline" onClick={joinWaitlist}>
                            <BellRing className="mr-1 h-3.5 w-3.5" /> Notify me
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPinned className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  The address is saved as a snapshot on this order, so editing it
                  later never changes past orders.
                </p>
              </CardContent>
            </Card>
            )}

            {step === 'rx' && needsRxStep && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Pill className="h-5 w-5 text-amber-600" /> Prescription
                    <Badge className="border-amber-400 bg-amber-50 text-amber-800">
                      Required
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {prescriptionId
                      ? 'Prescription attached. Our pharmacist will verify it, usually within 15 minutes.'
                      : `These ${rxItems.length} item${rxItems.length === 1 ? '' : 's'} need${rxItems.length === 1 ? 's' : ''} a prescription: ${rxNames}. The other ${otcItems.length} do not.`}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant={prescriptionId ? 'outline' : 'default'}>
                      <Link href="/prescriptions/upload?returnTo=checkout">
                        {prescriptionId ? 'Replace prescription' : 'Upload prescription'}
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/prescriptions?returnTo=checkout">My prescriptions</Link>
                    </Button>
                  </div>

                  {prescriptionId && (
                    <p className="flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Attached
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 'pay' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" /> Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>UPI first, then cards, netbanking and wallets.</p>
                <p>
                  If your prescription is rejected, or no pharmacy can stock an
                  item, the refund is automatic — you never pay for something we
                  cannot deliver.
                </p>
              </CardContent>
            </Card>
            )}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 font-semibold">
                  Order summary ({itemCount} item{itemCount === 1 ? '' : 's'})
                </h2>

                <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                  {items.map((i) => (
                    <div key={i.medicineId} className="flex items-start justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {i.quantity} × ₹{i.price}
                        </p>
                        {i.requiresPrescription && (
                          <Badge className="mt-1 border-amber-400 bg-amber-50 text-[10px] text-amber-800">
                            Rx
                          </Badge>
                        )}
                      </div>
                      <p className="shrink-0 font-medium">
                        ₹{i.price * i.quantity}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>{deliveryFee === 0 ? 'FREE' : `₹{deliveryFee}`}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>

                {error && (
                  <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p>
                )}

                {step === 'pay' && needsRxStep && !prescriptionId ? (
                  <>
                    <Button className="mt-4 w-full" size="lg" disabled={!addressValid} onClick={() => setStep('rx')}>
                      {addressValid ? 'Upload prescription to continue' : 'Add a serviceable address'}
                    </Button>
                    <Button
                      className="mt-2 w-full"
                      size="sm"
                      variant="ghost"
                      disabled={!addressValid || submitting || !hasOtcItems}
                      onClick={() => placeOrder(otcItems)}
                    >
                      {hasOtcItems
                        ? `Continue without prescription (${otcItems.length} item${otcItems.length === 1 ? '' : 's'})`
                        : 'Every item in your cart needs a prescription'}
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      {hasOtcItems
                        ? `This order covers only the ${otcItems.length} medicine${otcItems.length === 1 ? '' : 's'} that do not need one. ${rxNames} will be left out.`
                        : 'Upload a prescription to check out these medicines.'}
                    </p>
                  </>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    disabled={step === 'address' ? !addressValid : submitting}
                    onClick={() => {
                      if (submitting) return
                      if (step === 'pay') {
                        placeOrder()
                      } else {
                        setError('')
                        setStep(step === 'address' && needsRxStep ? 'rx' : 'pay')
                      }
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {paymentStage === 'processing' ? 'Confirming payment…' : 'Placing order…'}
                      </>
                    ) : step === 'pay' ? (
                      <>Pay ₹{grandTotal}</>
                    ) : step === 'address' && !addressValid ? (
                      'Add a serviceable address'
                    ) : step === 'address' && needsRxStep ? (
                      'Continue to prescription'
                    ) : (
                      'Continue to payment'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
