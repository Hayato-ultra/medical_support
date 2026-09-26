'use client'

import { useCart } from '@/components/customer/cart-provider'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkout } from '@/components/customer/checkout'
import { AlertCircle, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutPage() {
  const { items, total, itemCount, clearCart } = useCart()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [address, setAddress] = useState('')
  const [pincode, setPincode] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const deliveryFee = total > 500 ? 0 : 40

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to checkout</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login" className="text-primary underline">
              Go to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handlePlaceOrder = async () => {
    setLoading(true)
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          pharmacyId: items[0]?.medicineId ? '' : '',
          items: items.map((i) => ({ medicineId: i.medicineId, quantity: i.quantity, price: i.price })),
          totalAmount: total,
          deliveryFee,
          deliveryAddress: { label: 'Home', address, pincode },
          notes,
        }),
      })

      if (orderRes.ok) {
        const data = await orderRes.json()
        clearCart()
        router.push(`/orders/${data.orderNumber}`)
      } else {
        const error = await orderRes.json()
        alert(error.error || 'Order failed')
      }
    } catch (err) {
      alert('Order failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Address</CardTitle>
                <CardDescription>Enter your delivery address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Address</Label>
                  <Input placeholder="Street, Building, Area" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Pincode</Label>
                    <Input placeholder="600001" value={pincode} onChange={(e) => setPincode(e.target.value)} />
                  </div>
                  <div>
                    <Label>Delivery Time</Label>
                    <div className="p-2 bg-muted rounded text-sm text-muted-foreground">
                      30-60 min
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Special Instructions</Label>
                  <Textarea placeholder="Any special instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Items ({itemCount})</CardTitle>
                <CardDescription>Items from {items.length} {items.length === 1 ? 'pharmacy' : 'pharmacies'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.medicineId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity} × ₹{item.price}</p>
                    </div>
                    <p className="font-medium">₹{item.price * item.quantity}</p>
                  </div>
                ))}
                <Separator />
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span>₹{total + deliveryFee}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Checkout total={total} deliveryFee={deliveryFee} />
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <Button onClick={handlePlaceOrder} disabled={loading || items.length === 0} size="lg" className="flex-1">
            {loading ? 'Placing Order...' : `Place Order — ₹${total + deliveryFee}`}
          </Button>
          <Link href="/medicines">
            <Button variant="outline" size="lg">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
