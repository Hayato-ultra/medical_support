'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ShoppingCart, Package, Store, MapPin, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [role, setRole] = useState('customer')
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
        fetch(`/api/orders?customerId=${user?.id}`),
        fetch(`/api/prescriptions?customerId=${user?.id}`),
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRole(params.get('role') || 'customer')
  }, [])

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
    { label: 'Total Orders', value: String(orders.length), change: 'All time', icon: ShoppingCart, color: 'text-blue-600' },
    { label: 'Confirmed', value: String(orders.filter((o: any) => o.status === 'CONFIRMED').length), change: 'Ready to process', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Rx', value: String(prescriptions.filter((p: any) => p.status === 'PENDING').length), change: 'Need verification', icon: AlertCircle, color: 'text-yellow-600' },
    { label: 'Delivered', value: String(orders.filter((o: any) => o.status === 'DELIVERED').length), change: 'Completed', icon: Clock, color: 'text-gray-600' },
  ]

  const config: Record<string, { title: string; desc: string; icon: any; color: string }> = {
    customer: { title: 'Customer Dashboard', desc: 'Browse medicines, upload prescriptions, and track orders', icon: ShoppingCart, color: 'text-blue-600' },
    pharmacy: { title: 'Pharmacy Dashboard', desc: 'Verify prescriptions and manage orders', icon: Store, color: 'text-green-600' },
    rider: { title: 'Rider Dashboard', desc: 'View deliveries and update status', icon: MapPin, color: 'text-orange-600' },
    admin: { title: 'Admin Dashboard', desc: 'Overview of the platform', icon: Package, color: 'text-purple-600' },
  }
  const cfg = config[role] || config.customer
  const Icon = cfg.icon

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">Medical Support</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{role}</Badge>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Icon className={`h-8 w-8 ${cfg.color}`} />
          <div>
            <h1 className="text-3xl font-bold">{cfg.title}</h1>
            <p className="text-muted-foreground">{cfg.desc}</p>
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
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>View and track your orders</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-4">No orders yet</p>
                  <Link href="/medicines"><Button>Browse Medicines</Button></Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge variant={order.status === 'CONFIRMED' ? 'default' : order.status === 'PACKING' ? 'secondary' : 'outline'}>
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prescriptions</CardTitle>
              <CardDescription>Upload and verify your prescriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="mb-4">No prescriptions uploaded</p>
                  <Link href="/medicines"><Button>Browse Medicines</Button></Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {prescriptions.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{p.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge variant={p.status === 'VERIFIED' ? 'default' : 'secondary'}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}