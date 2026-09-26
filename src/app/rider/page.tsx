'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, MapPin, Package, ShoppingCart, Clock, CheckCircle, AlertCircle, Loader2, Navigation } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function RiderPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState<any[]>([])
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
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data.orders || [])
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
    { label: 'Active Deliveries', value: String(orders.filter((o: any) => ['PENDING', 'CONFIRMED', 'PACKING'].includes(o.status)).length), change: 'In progress', icon: Package, color: 'text-blue-600' },
    { label: 'On Route', value: String(orders.filter((o: any) => o.status === 'OUT_FOR_DELIVERY').length), change: 'Delivering now', icon: Navigation, color: 'text-orange-600' },
    { label: 'Completed Today', value: String(orders.filter((o: any) => o.status === 'DELIVERED').length), change: 'Done', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Pickup', value: String(orders.filter((o: any) => o.status === 'PICKUP').length), change: 'Awaiting', icon: Clock, color: 'text-yellow-600' },
  ]

  const activeOrders = orders.filter((o: any) => ['PENDING', 'CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY'].includes(o.status))

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-orange-600" />
            <span className="text-xl font-bold tracking-tight">Medical Support</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-orange-50 text-orange-700">Rider</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <MapPin className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold">Rider Dashboard</h1>
            <p className="text-muted-foreground">View deliveries and update status</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Active Deliveries</CardTitle>
            <CardDescription>Your current delivery assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {activeOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Navigation className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="mb-4">No active deliveries</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground">{order.deliveryAddress ? JSON.parse(order.deliveryAddress).address : 'No address'}</p>
                    </div>
                    <Badge variant={order.status === 'DELIVERED' ? 'default' : order.status === 'OUT_FOR_DELIVERY' ? 'secondary' : 'outline'}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}