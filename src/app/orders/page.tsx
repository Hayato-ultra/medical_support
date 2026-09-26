'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Package, ShoppingCart, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  PACKING: { label: 'Packing', color: 'bg-purple-100 text-purple-800' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', color: 'bg-indigo-100 text-indigo-800' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-800' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
}

export default function OrdersPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const searchParams = new URLSearchParams(window.location.search)
  const role = searchParams.get('role') || 'customer'
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
      return
    }
    fetchOrders()
  }, [isLoading, isAuthenticated])

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?customerId=${user?.id}`)
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const myOrders = role === 'pharmacy' || role === 'rider' ? orders : orders
  const allOrders = myOrders

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Medical Support</span>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard?role={role}"><ArrowLeft className="mr-2 h-4 w-4" /> Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="container py-8 max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-2">
          {role === 'pharmacy' ? 'Pharmacy Orders' : role === 'rider' ? 'My Deliveries' : 'My Orders'}
        </h1>
        <p className="text-muted-foreground mb-8">
          {role === 'pharmacy' ? 'Orders placed by customers' : role === 'rider' ? 'Your delivery assignments' : 'Track your medicine orders'}
        </p>

        {allOrders.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders found</h2>
            <p className="text-muted-foreground mb-4">
              {role === 'pharmacy'
                ? 'No orders have been placed yet'
                : role === 'rider'
                ? 'No deliveries assigned yet'
                : 'Start by browsing medicines and placing an order'}
            </p>
            <Link href="/medicines">
              <Button size="lg">Browse Medicines <ArrowRight className="h-4 w-4 ml-2" /></Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {allOrders.map((order: any) => {
              const statusInfo = statusConfig[order.status] || statusConfig.PENDING
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                        <CardDescription>
                          {new Date(order.createdAt).toLocaleDateString('en-IN')}
                        </CardDescription>
                      </div>
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">₹{order.totalAmount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <span>{order.status}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <Button variant="outline" size="sm">View Details</Button>
                        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                          <Link href={`/medicines/${order.items?.[0]?.medicineId}`}>
                            <Button size="sm">View Medicine</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}