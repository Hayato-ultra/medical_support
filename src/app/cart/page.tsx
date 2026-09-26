'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useCart, MAX_QTY, FREE_DELIVERY_ABOVE } from '@/components/customer/cart-provider'
import { useAuth } from '@/hooks/useAuth'
import {
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, Pill, Lock, Truck,
} from 'lucide-react'

export default function CartPage() {
  const { items, itemCount, total, deliveryFee, grandTotal, hasPrescriptionItems, updateQuantity, removeFromCart, clearCart } =
    useCart()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Sign in to view your cart</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Your cart is saved on this device. Sign in and it will be right
              where you left it.
            </p>
            <Button asChild>
              <Link href="/login?next=%2Fcart">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <ShoppingCart className="mb-4 h-14 w-14 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Your cart is empty</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Pick the medicines you need first. We will only ask for a
              prescription if one of them actually requires it.
            </p>
            <Button asChild>
              <Link href="/medicines">Browse medicines</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_ABOVE - total)

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Your cart</h1>
            <p className="text-sm text-muted-foreground">
              {itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart}>
            <Trash2 className="mr-2 h-4 w-4" /> Clear cart
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.medicineId}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/medicines/${item.medicineId}`}
                      className="font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.requiresPrescription && (
                      <Badge className="mt-2 w-fit border-amber-400 bg-amber-50 text-amber-800">
                        <Pill className="mr-1 h-3 w-3" /> Prescription required
                      </Badge>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">
                      ₹{item.price} each
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateQuantity(item.medicineId, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-9 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => updateQuantity(item.medicineId, item.quantity + 1)}
                        disabled={item.quantity >= MAX_QTY}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="w-20 text-right font-semibold">
                      ₹{item.price * item.quantity}
                    </p>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-red-600"
                      onClick={() => removeFromCart(item.medicineId)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {itemCount >= MAX_QTY * items.length && (
              <p className="text-xs text-muted-foreground">
                Maximum 10 units per medicine. Contact us for bulk orders.
              </p>
            )}

            <Button variant="ghost" size="sm" asChild>
              <Link href="/medicines">Continue shopping</Link>
            </Button>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 font-semibold">Order summary</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                  </div>
                </div>

                {amountToFreeDelivery > 0 && (
                  <p className="mt-3 rounded-md bg-primary/10 p-2 text-xs text-primary">
                    Add ₹{amountToFreeDelivery} more for free delivery.
                  </p>
                )}

                <Separator className="my-4" />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{grandTotal}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Delivery fee is included — no extra charges at the last step.
                </p>

                {hasPrescriptionItems ? (
                  <>
                    <Button
                      className="mt-4 w-full"
                      size="lg"
                      onClick={() => router.push('/checkout')}
                    >
                      Proceed to checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="mt-2 text-center text-xs text-amber-700">
                      We will ask for a prescription at checkout for{' '}
                      {items.filter((i) => i.requiresPrescription).length} of your{' '}
                      {items.length} items. Nothing else needs one.
                    </p>
                  </>
                ) : (
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={() => router.push('/checkout')}
                  >
                    Proceed to checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}

                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Delivered in 30–60 minutes after your order is confirmed.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
