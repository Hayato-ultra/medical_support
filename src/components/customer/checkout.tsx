'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart } from 'lucide-react'

interface CheckoutProps {
  total: number
  deliveryFee: number
}

export function Checkout({ total, deliveryFee }: CheckoutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Order Summary
        </CardTitle>
        <CardDescription>Total charges</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>₹{total}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery Fee</span>
          <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{total + deliveryFee}</span>
        </div>
      </CardContent>
    </Card>
  )
}
