'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import {
  Pill, Search, Camera, RefreshCw, ArrowRight, Clock, MapPin,
  ShieldCheck, ShoppingCart, Upload, Bell,
} from 'lucide-react'

const roleHome: Record<string, string> = {
  CUSTOMER: '/dashboard?role=customer',
  PHARMACY_OWNER: '/pharmacy',
  PHARMACY_STAFF: '/pharmacy',
  RIDER: '/rider',
  ADMIN: '/dashboard?role=admin',
}

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.role) return
    router.replace(roleHome[user.role] || '/medicines')
  }, [isLoading, isAuthenticated, user, router])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicines?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        setSuggestions((data.medicines || []).slice(0, 5))
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Medical Support</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/medicines">Browse medicines</Link>
            </Button>

            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/orders">
                    <ShoppingCart className="mr-2 h-4 w-4" /> My orders
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/dashboard?role=customer">
                    Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
            <Badge variant="secondary" className="mb-4">
              Delivering to 20,000+ pincodes
            </Badge>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Medicines at your door in{' '}
              <span className="text-primary">30 minutes</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Search a medicine, upload a prescription, or reorder from your last
              order. No account needed to start.
            </p>

            <div ref={boxRef} className="relative max-w-xl mx-auto text-left">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search “dolo” or “paracetamol 650”"
                    className="h-12 pl-11 text-base"
                    autoComplete="off"
                  />
                </div>
                <Button
                  size="lg"
                  className="h-12"
                  onClick={() => router.push(`/medicines?query=${encodeURIComponent(query)}`)}
                >
                  Search
                </Button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-background shadow-lg">
                  {suggestions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => router.push(`/medicines/${m.id}`)}
                      className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.strength}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {m.requiresPrescription && (
                          <Badge variant="outline" className="mb-1 border-amber-400 text-amber-700">
                            Rx
                          </Badge>
                        )}
                        <p className="text-sm font-semibold">
                          {m.inStock ? `₹${m.price}` : 'Out of stock'}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => router.push(`/medicines?query=${encodeURIComponent(query)}`)}
                    className="w-full bg-muted px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    See all results
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/prescriptions/upload">
                  <Camera className="mr-2 h-4 w-4" /> Upload prescription
                </Link>
              </Button>
              {isAuthenticated ? (
                <Button variant="outline" asChild>
                  <Link href="/orders">
                    <RefreshCw className="mr-2 h-4 w-4" /> Reorder
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link href="/register">
                    <RefreshCw className="mr-2 h-4 w-4" /> Create account to reorder
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-6 text-2xl font-bold">Order in four steps</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '1',
                title: 'Find your medicine',
                body: 'Search by name, or upload a prescription and let our pharmacist build the cart for you.',
                icon: Search,
                cta: { label: 'Search medicines', href: '/medicines' },
              },
              {
                step: '2',
                title: 'Review your cart',
                body: 'See the total including delivery fee upfront. Prescription items are flagged in amber.',
                icon: ShoppingCart,
                cta: { label: 'Open cart', href: '/cart' },
              },
              {
                step: '3',
                title: 'Pay securely',
                body: 'UPI first, then cards and netbanking. Nothing is charged if your prescription is rejected.',
                icon: ShieldCheck,
                cta: { label: 'How payment works', href: '/checkout' },
              },
              {
                step: '4',
                title: 'Track to your door',
                body: 'Live status updates, rider location, and a 6-digit OTP to confirm the right medicines reached you.',
                icon: MapPin,
                cta: { label: 'Track an order', href: '/orders' },
              },
            ].map((item) => (
              <Card key={item.step} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {item.step}
                    </span>
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 font-semibold">{item.title}</h3>
                  <p className="mb-4 flex-1 text-sm text-muted-foreground">
                    {item.body}
                  </p>
                  <Button variant="link" className="h-auto justify-start p-0" asChild>
                    <Link href={item.cta.href}>
                      {item.cta.label} <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/40">
          <div className="container mx-auto max-w-6xl px-4 py-14">
            <h2 className="mb-6 text-2xl font-bold">What you get</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Clock,
                  title: 'Usually verified in 15 minutes',
                  body: 'A pharmacist reviews your prescription and confirms your order. We text you the moment it is approved.',
                },
                {
                  icon: Bell,
                  title: 'Reorder in about 30 seconds',
                  body: 'Your prescriptions are saved in a library. Next time, pick one and pay — no camera needed.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Full refund if we cannot fulfil',
                  body: 'If your prescription is rejected or no pharmacy can stock your items, the refund is automatic.',
                },
              ].map((f) => (
                <Card key={f.title}>
                  <CardContent className="p-6">
                    <f.icon className="mb-3 h-6 w-6 text-primary" />
                    <h3 className="mb-2 font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>Medical Support — medicine delivery</span>
          <div className="flex gap-4">
            <Link href="/medicines" className="hover:text-foreground">Medicines</Link>
            <Link href="/orders" className="hover:text-foreground">Orders</Link>
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
