'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useCart } from '@/components/customer/cart-provider'
import { useAuth } from '@/hooks/useAuth'
import {
  Search, Loader2, Package, Pill, ShoppingCart, AlertTriangle, X,
} from 'lucide-react'

const categories = [
  'All', 'Analgesic', 'Antibiotic', 'Antihistamine', 'Antacid', 'Respiratory',
  'Diabetes', 'Cardiac', 'Supplement', 'Antiseptic', 'Antifungal', 'Electrolyte',
  'Ophthalmic', 'Hormone',
]

export default function MedicinesPage() {
  const router = useRouter()
  const { addToCart, itemCount, total } = useCart()
  const { isAuthenticated } = useAuth()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [rxOnly, setRxOnly] = useState(false)
  const [medicines, setMedicines] = useState<any[]>([])
  const [alternatives, setAlternatives] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initial = params.get('query')
    if (initial) setQuery(initial)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('query', query.trim())
      if (category !== 'All') params.set('category', category)
      if (rxOnly) params.set('requiresPrescription', '1')

      const res = await fetch(`/api/medicines?${params}`)
      const data = await res.json()
      setMedicines(data.medicines || [])
      setAlternatives(data.alternatives || {})
    } catch {
      setMedicines([])
    } finally {
      setLoading(false)
    }
  }, [query, category, rxOnly])

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [load, query])

  function handleAdd(medicine: any) {
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)
      return
    }
    addToCart({
      medicineId: medicine.id,
      name: medicine.name,
      price: medicine.price || 0,
      quantity: 1,
      requiresPrescription: medicine.requiresPrescription,
    })
    setAdded(medicine.id)
    setTimeout(() => setAdded(null), 1500)
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              <span className="font-bold">Medical Support</span>
            </Link>

            <div className="relative ml-auto hidden max-w-md flex-1 sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search medicines"
                className="pl-9"
              />
            </div>

            <Button variant="outline" size="sm" asChild>
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

          <div className="mt-3 sm:hidden">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicines"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Category</span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                category === c
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {c}
            </button>
          ))}
          <button
            onClick={() => setRxOnly(!rxOnly)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              rxOnly
                ? 'border-amber-500 bg-amber-500 text-white'
                : 'hover:bg-muted'
            }`}
          >
            Prescription only
          </button>
          {(query || category !== 'All' || rxOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery('')
                setCategory('All')
                setRxOnly(false)
              }}
            >
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {loading
            ? 'Searching…'
            : `${medicines.length} medicine${medicines.length === 1 ? '' : 's'}`}
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : medicines.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Package className="mb-4 h-14 w-14 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">
                No medicines matched “{query}”
              </h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                Check the spelling, or upload your prescription and our pharmacist
                will build the cart for you.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/prescriptions/upload">Upload prescription</Link>
                </Button>
                <Button variant="outline" onClick={() => { setQuery(''); setCategory('All'); setRxOnly(false) }}>
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {medicines.map((m) => {
              const alt = alternatives[m.id]?.[0]
              return (
                <Card key={m.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-5">
                    <Link href={`/medicines/${m.id}`} className="group">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-snug group-hover:underline">
                          {m.name}
                        </h3>
                        {m.requiresPrescription && (
                          <Badge className="shrink-0 border-amber-400 bg-amber-50 text-amber-800">
                            Prescription required
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{m.strength}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.manufacturer} · {m.dosageForm} · {m.category}
                      </p>
                    </Link>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        {m.inStock ? (
                          <>
                            <p className="text-xl font-bold">₹{m.price}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.stockAvailable} in stock
                            </p>
                          </>
                        ) : (
                          <p className="text-sm font-medium text-red-600">
                            Out of stock nearby
                          </p>
                        )}
                      </div>

                      {m.inStock ? (
                        <Button
                          size="sm"
                          onClick={() => handleAdd(m)}
                          disabled={added === m.id}
                        >
                          {added === m.id ? 'Added' : 'Add'}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not orderable
                        </span>
                      )}
                    </div>

                    {!m.inStock && alt && (
                      <div className="mt-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Cheaper alternative with the same salt
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{alt.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {alt.manufacturer}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleAdd({ ...alt, requiresPrescription: false, inStock: true, stockAvailable: 1 })
                            }
                          >
                            ₹{alt.price}
                          </Button>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          We never swap automatically — you choose.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="container mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm">
              <span className="font-semibold">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
              <span className="ml-2 text-muted-foreground">₹{total}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/cart">View cart</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/checkout">Checkout</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
