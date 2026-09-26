'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Store, ShoppingCart, Package, Clock, CheckCircle, AlertCircle, Loader2, ArrowRight, Eye } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function PharmacyPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated])

  const fetchData = async () => {
    try {
      const [ordersRes, rxRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/prescriptions'),
      ])
      const ordersData = await ordersRes.json()
      const rxData = await rxRes.json()
      setOrders(ordersData.orders || [])
      setPrescriptions(rxData.prescriptions || [])
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const stats = [
    { label: 'New Orders', value: String(orders.filter((o: any) => o.status === 'PENDING').length), change: 'Need action', icon: ShoppingCart, color: 'text-yellow-600' },
    { label: 'Confirmed', value: String(orders.filter((o: any) => o.status === 'CONFIRMED').length), change: 'Ready to process', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Rx', value: String(prescriptions.filter((p: any) => p.status === 'PENDING').length), change: 'Awaiting docs', icon: AlertCircle, color: 'text-blue-600' },
    { label: 'Verified Today', value: String(orders.filter((o: any) => o.status === 'VERIFIED').length), change: 'Confirmed', icon: Package, color: 'text-purple-600' },
  ]

  const pendingPrescriptions = prescriptions.filter((p: any) => p.status === 'PENDING')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold tracking-tight">Medical Support</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700">Pharmacy</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Store className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
            <p className="text-muted-foreground">Verify prescriptions and manage orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const StatIcon = stat.icon
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <StatIcon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator className="mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Prescription Verification</CardTitle>
              <CardDescription>Verify customer prescriptions before dispensing</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPrescriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-4">All prescriptions verified</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPrescriptions.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{p.id}</p>
                        <p className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge variant="secondary">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Orders requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-4">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{o.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge variant={o.status === 'PENDING' ? 'outline' : 'default'}>{o.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {pendingPrescriptions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-3">Actions</h2>
            <div className="flex gap-3">
              <Link href="/api/prescriptions">
                <Button>Verify Prescriptions</Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}