'use client'

import { useCart } from '@/components/customer/cart-provider'
import { Cart } from '@/components/customer/cart'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function CartPage() {
  const { isAuthenticated } = useAuth()
  const { items, total, itemCount, clearCart } = useCart()
  const router = useRouter()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground mb-4">Sign in to view your cart</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Cart</h1>
            <p className="text-muted-foreground">{itemCount} items in your cart</p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" onClick={clearCart}>Clear Cart</Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-4">Browse medicines and add them to your cart</p>
            <Link href="/medicines">
              <Button size="lg">Browse Medicines</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <Cart />

            <div className="border rounded-lg p-4 bg-background">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold">Total: ₹{total}</span>
                <Link href="/checkout">
                  <Button size="lg">
                    Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload your prescription if required, then proceed to checkout.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}