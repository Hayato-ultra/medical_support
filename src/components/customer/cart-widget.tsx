'use client'

import { useCart } from '@/components/customer/cart-provider'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function CartWidget() {
  const { itemCount, total } = useCart()
  const { isAuthenticated } = useAuth()
  const [showCart, setShowCart] = useState(false)
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (itemCount === 0 || pathname === '/' || pathname === '/cart' || isAdminRoute) return null

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCart(!showCart)}
        className="relative"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Cart ({itemCount})
      </Button>
      {showCart && (
        <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm">Your Cart</CardTitle>
            <CardDescription>{itemCount} items • ₹{total}</CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-2" />
            <Link href="/cart">
              <Button className="w-full" size="sm">
                View Cart & Checkout
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link href="/login">
                <Button variant="outline" className="w-full mt-2" size="sm">
                  Sign In to Checkout
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
