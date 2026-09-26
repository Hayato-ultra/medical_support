'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMedicine } from '@/hooks/useMedicines'
import { useCart } from '@/components/customer/cart-provider'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Package, ShoppingCart, Check, Loader2, ArrowLeft, Pill, AlertTriangle,
  Truck, Store,
} from 'lucide-react'

export default function MedicineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { medicine, loading } = useMedicine(params.id as string)
  const { addToCart, itemCount } = useCart()
  const { isAuthenticated } = useAuth()
  const [added, setAdded] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!medicine) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Medicine not found</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              It may have been removed from the catalog.
            </p>
            <Button asChild>
              <Link href="/medicines">Browse all medicines</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  function handleAdd() {
    if (!isAuthenticated) {
      router.push(
        `/login?next=${encodeURIComponent(window.location.pathname)}`
      )
      return
    }
    addToCart({
      medicineId: medicine!.id,
      name: medicine!.name,
      price: medicine!.price || 0,
      quantity: 1,
      requiresPrescription: medicine!.requiresPrescription,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const outOfStock = medicine.inStock === false

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/medicines">
              <ArrowLeft className="mr-2 h-4 w-4" /> Medicines
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <Link href="/cart">
              <ShoppingCart className="mr-2 h-4 w-4" /> Cart
              {itemCount > 0 && (
                <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex h-64 items-center justify-center rounded-lg bg-muted">
            <Package className="h-24 w-24 text-muted-foreground" />
          </div>

          <div>
            <h1 className="mb-1 text-2xl font-bold leading-snug">{medicine.name}</h1>
            <p className="mb-4 text-muted-foreground">{medicine.manufacturer}</p>

            {medicine.requiresPrescription && (
              <Badge className="mb-4 border-amber-400 bg-amber-50 text-amber-800">
                <Pill className="mr-1 h-3 w-3" /> Prescription required
              </Badge>
            )}

            <div className="mb-5 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Dosage form: </span>
                {medicine.dosageForm}
              </p>
              <p>
                <span className="text-muted-foreground">Strength: </span>
                {medicine.strength}
              </p>
              <p>
                <span className="text-muted-foreground">Category: </span>
                {medicine.category}
              </p>
            </div>

            {medicine.description && (
              <p className="mb-5 text-sm text-muted-foreground">
                {medicine.description}
              </p>
            )}

            <Separator className="mb-5" />

            {outOfStock ? (
              <>
                <p className="mb-4 text-lg font-semibold text-red-600">
                  Out of stock nearby
                </p>
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-900">
                    <AlertTriangle className="h-4 w-4" /> We will tell you when it is back
                  </p>
                  <p className="mb-3 text-xs text-amber-800">
                    Search for the same salt from a different brand — we never swap
                    it for you.
                  </p>
                  <Button size="sm" asChild>
                    <Link href={`/medicines?query=${encodeURIComponent(medicine.strength)}`}>
                      Find alternatives
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold">₹{medicine.price}</p>
                <p className="mb-5 text-xs text-muted-foreground">
                  {medicine.stockAvailable} in stock nearby
                </p>
                <div className="flex gap-2">
                  <Button size="lg" className="flex-1" onClick={handleAdd} disabled={added}>
                    {added ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Added to cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
                      </>
                    )}
                  </Button>
                  {added && (
                    <Button size="lg" variant="outline" asChild>
                      <Link href="/cart">Go to cart</Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Truck className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">30–60 minute delivery</p>
              <p className="text-xs text-muted-foreground">
                Free above ₹500, otherwise ₹40.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Store className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">Verified pharmacy</p>
              <p className="text-xs text-muted-foreground">
                Every order is checked by a licensed pharmacist.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
