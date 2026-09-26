'use client'

import { useCart } from '@/components/customer/cart-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { X, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

export function Cart() {
  const { items, removeFromCart, updateQuantity, total, itemCount, clearCart } = useCart()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({itemCount})
          </CardTitle>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart}>
              Clear All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Your cart is empty</p>
              <Link href="/medicines" className="text-primary underline mt-2 inline-block">
                Browse Medicines
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.medicineId} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price} each</p>
                    {item.requiresPrescription && (
                      <Badge variant="secondary" className="mt-1">Rx Required</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.medicineId, item.quantity - 1)}
                    >
                      −
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.medicineId, item.quantity + 1)}
                    >
                      +
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.medicineId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between font-bold text-lg">
                <p>Total</p>
                <p>₹{total}</p>
              </div>
              <Link href="/checkout">
                <Button className="w-full" size="lg">
                  Proceed to Checkout
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
