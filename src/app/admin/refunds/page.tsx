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
import { Loader2, RotateCcw, Search, Filter, AlertTriangle } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  approved: 'bg-blue-100 text-blue-800 border-blue-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  processed: 'bg-green-100 text-green-800 border-green-300',
}

export default function RefundsPage() {
  const { isLoading: authLoading } = useAuth()
  const [refunds, setRefunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected' | 'processed'>('ALL')

  async function fetchRefunds() {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase
        .from('refunds')
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
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100)
      if (error) throw error
      setRefunds(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refunds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRefunds()
  }, [statusFilter])

  async function handleAction(refundId: string, action: 'approve' | 'reject') {
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('refunds')
        .update({ status: action === 'approve' ? 'approved' : 'rejected', updated_at: new Date().toISOString() })
        .eq('id', refundId)
      if (error) throw error
      fetchRefunds()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Refunds</h1>
          <p className="text-muted-foreground">Manage refund requests and process approvals.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search order #, refund ID..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Refund ID</th>
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Requested</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds
                  .filter((r) => {
                    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
                    return true
                  })
                  .map((refund: any) => (
                    <tr key={refund.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-4 font-mono text-xs">{refund.id.slice(0, 12)}...</td>
                      <td className="px-4 py-4">{refund.orders?.order_number ?? '&mdash;'}</td>
                      <td className="px-4 py-4 font-medium">₹{Number(refund.amount).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-4 max-w-xs truncate">{refund.reason ?? '&mdash;'}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={refund.status === 'pending' ? 'bg-amber-100 text-amber-800' : refund.status === 'approved' ? 'bg-blue-100 text-blue-800' : refund.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                          {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {new Date(refund.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-4">
                        {refund.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button variant="default" size="sm" onClick={() => handleAction(refund.id, 'approve')}>
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleAction(refund.id, 'reject')}>
                              Reject
</Button>
                           </div>
                         )}
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