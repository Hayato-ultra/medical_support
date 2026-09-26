'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Pill, Shield, MapPin, Clock, Star, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Pill,
    title: 'Prescription Verification',
    description: 'Upload and verify prescriptions with pharmacy-approved workflows',
  },
  {
    icon: MapPin,
    title: 'Nearby Pharmacy Search',
    description: 'Find the closest pharmacies with available stock in real-time',
  },
  {
    icon: Clock,
    title: 'Fast Delivery',
    description: 'Track your order from pharmacy to doorstep with live updates',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'Safe and encrypted payment processing for every order',
  },
]

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated && user?.role) {
    const role = user.role.toLowerCase()
    switch (role) {
      case 'customer':
        router.push('/dashboard?role=customer')
        break
      case 'pharmacy_owner':
      case 'pharmacy_staff':
        router.push('/dashboard?role=pharmacy')
        break
      case 'rider':
        router.push('/dashboard?role=rider')
        break
      case 'admin':
        router.push('/dashboard?role=admin')
        break
      default:
        router.push('/login')
        break
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Medical Support</span>
          </div>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">Welcome, {user?.email}</span>
                <Button variant="destructive" size="sm" onClick={() => router.back()}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="container py-20 md:py-32 mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Star className="mr-2 h-4 w-4" /> Now Available Nationwide
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
            Medicine Delivery,
            <br />
            <span className="text-primary">Simplified</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Order medicines from nearby pharmacies with prescription verification,
            real-time inventory, and fast doorstep delivery.
          </p>
          {!isAuthenticated && (
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild className="gap-2">
                <Link href="/register">Get Started <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          )}
        </section>

        <Separator className="max-w-7xl mx-auto" />

        <section className="container py-20 md:py-32 mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="link" size="sm" className="p-0">
                    Learn More <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container py-20 md:py-32 mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Place Order', desc: 'Browse medicines and place your order with prescription' },
              { step: '2', title: 'Verify', desc: 'Pharmacy verifies your prescription and confirms stock' },
              { step: '3', title: 'Get Delivered', desc: 'Track your order in real-time until doorstep delivery' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
