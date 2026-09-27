'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/browser-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CreditCard, DollarSign, Search, Filter } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  refunded: 'bg-blue-100 text-blue-800 border-blue-300',
}

export default function PaymentsPage() {
  const { isLoading: authLoading } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'completed' | 'pending' | 'failed' | 'refunded'>('ALL')
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'upi' | 'card' | 'netbanking' | 'wallet' | 'cash'>('ALL')

  async function fetchPayments() {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('payments')
        .select(`
          *,
          orders (
            order_number,
            customer_id,
            total_amount
          )
        `)
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter)
      }
      if (methodFilter !== 'ALL') {
        query = query.eq('payment_method', methodFilter)
      }
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [statusFilter, methodFilter])

  function formatCurrency(amount: number | string) {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">View and manage payment transactions.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, transaction ID..."
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
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={(v) => setMethodFilter(v as typeof methodFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Methods</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="netbanking">Net Banking</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Transaction ID</th>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Method</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: any) => (
                  <tr key={payment.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-4 font-mono text-xs">{payment.id.slice(0, 12)}...</td>
                    <td className="px-4 py-4">{payment.orders?.order_number ?? '&mdash;'}</td>
                    <td className="px-4 py-4 font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-4 capitalize">{payment.payment_method ?? '&mdash;'}</td>
                    <td className="px-4 py-4">
                      <Badge variant="outline" className={STATUS_COLORS[payment.status] || ''}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
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