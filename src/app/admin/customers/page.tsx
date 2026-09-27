'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/browser-client'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Users, MapPin, Phone, Mail, Search, Filter } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300',
}

export default function CustomersPage() {
  const { isLoading: authLoading } = useAuth()
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL')

  async function fetchCustomers() {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase.from('customers').select(`
        *,
        users!inner (
          email,
          role
        )
      `)
      if (statusFilter !== 'ALL') {
        query = query.eq('users.is_active', statusFilter === 'active')
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage customer accounts and view their details.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-left font-medium">Addresses</th>
                  <th className="px-4 py-3 text-left font-medium">Orders</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {customers
                  .filter((c) => {
                    if (statusFilter !== 'ALL') {
                      if (statusFilter === 'active' && !c.users?.is_active) return false
                      if (statusFilter === 'inactive' && c.users?.is_active) return false
                    }
                    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                        !c.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) &&
                        !c.phone.toLowerCase().includes(searchQuery.toLowerCase())) return false
                    return true
                  })
                  .map((customer: any) => (
                    <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-4 py-4">{customer.users?.email ?? '&mdash;'}</td>
                      <td className="px-4 py-4">{customer.phone}</td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">{customer.addresses?.length ?? 0} addresses</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground">{customer.orders?.length ?? 0} orders</span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={customer.users?.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {customer.users?.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}