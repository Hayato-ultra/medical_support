'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Loader2, CheckCircle, XCircle, Clock, FileText, AlertTriangle, User, Calendar, Clock as ClockIcon, Image as ImageIcon, ExternalLink, ChevronDown } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  VERIFIED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
}

const REJECTION_REASONS = [
  'Illegible image',
  'Expired prescription',
  'Invalid doctor signature',
  'Medicine not matching prescription',
  'Dosage unclear',
  'Patient name mismatch',
  'Prescription older than 6 months',
  'Other',
]

export default function RxQueuePage() {
  const { isLoading: authLoading, user } = useAuth()
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRx, setSelectedRx] = useState<any>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING')
  const [stats, setStats] = useState({ pending: 0, verified: 0, rejected: 0, avgVerifyMin: 0 })

  async function fetchQueue() {
    try {
      const res = await fetch(`/api/prescriptions?status=${statusFilter}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setPrescriptions(data.prescriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load prescriptions')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/prescriptions?status=PENDING')
      const data = await res.json()
      const pending = data.prescriptions?.length ?? 0
      const [vRes, rRes] = await Promise.all([
        fetch('/api/prescriptions?status=VERIFIED'),
        fetch('/api/prescriptions?status=REJECTED'),
      ])
      const vData = await vRes.json()
      const rData = await rRes.json()
      const verified = vData.prescriptions?.length ?? 0
      const rejected = rData.prescriptions?.length ?? 0

      const all = [...(vData.prescriptions || []), ...(rData.prescriptions || [])]
      let avgMin = 0
      if (all.length > 0) {
        const totalMs = all.reduce((sum: number, p: any) => {
          if (p.verifiedAt && p.createdAt) return sum + (new Date(p.verifiedAt).getTime() - new Date(p.createdAt).getTime())
          return sum
        }, 0)
        avgMin = Math.round(totalMs / all.length / 60000)
      }
      setStats({ pending, verified, rejected, avgVerifyMin: avgMin })
    } catch {}
  }

  useEffect(() => {
    fetchQueue()
    fetchStats()
  }, [statusFilter])

  async function handleAction() {
    if (!selectedRx) return
    setSubmitting(true)
    setError('')
    try {
      const status = action === 'approve' ? 'VERIFIED' : 'REJECTED'
      const notes = action === 'reject' ? (rejectReason === 'Other' ? customReason : rejectReason) : 'Prescription verified. The customer has been notified.'
      const res = await fetch(`/api/prescriptions/${selectedRx.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setSelectedRx(null)
      setAction(null)
      setRejectReason('')
      setCustomReason('')
      await fetchQueue()
      await fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  function formatAge(createdAt: string) {
    const ms = Date.now() - new Date(createdAt).getTime()
    const min = Math.floor(ms / 60000)
    if (min < 60) return `${min}m ago`
    const hr = Math.floor(min / 60)
    return `${hr}h ${min % 60}m ago`
  }

  function formatTime(iso?: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
          <h1 className="text-3xl font-bold tracking-tight">Rx Verification Queue</h1>
          <p className="text-muted-foreground">
            Review and decide on pending prescriptions. SLA: 15 minutes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="flex h-10 w-[180px] items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected Today</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Verify Time</p>
                <p className="text-2xl font-bold">{stats.avgVerifyMin} min</p>
              </div>
              <ClockIcon className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{statusFilter} Prescriptions ({prescriptions.length})</span>
            {statusFilter === 'PENDING' && stats.pending > 0 && (
              <Badge className={cn('text-xs', stats.pending > 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
                {stats.pending > 15 ? '⚠ SLA BREACH' : stats.pending > 5 ? '⚠ High' : 'Normal'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
              <p>No {statusFilter.toLowerCase()} prescriptions</p>
            </div>
          ) : (
            <div className="space-y-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Prescription</th>
                    <th className="px-4 py-3 text-left font-medium">Customer</th>
                    <th className="px-4 py-3 text-left font-medium">Age</th>
                    <th className="px-4 py-3 text-left font-medium">Doctor / Expiry</th>
                    <th className="px-4 py-3 text-left font-medium">Image</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((rx: any) => (
                    <tr key={rx.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">#{rx.id.slice(0, 8)}</p>
                          <Badge variant="outline" className={cn('mt-1', STATUS_COLORS[rx.status] || '')}>
                            {rx.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{rx.customerId?.slice(0, 8) ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className={cn('flex items-center gap-1', rx.status === 'PENDING' && Number(formatAge(rx.createdAt).replace('m ago', '')) > 15 ? 'text-red-600 font-medium' : '')}>
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{formatAge(rx.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{rx.doctorName || 'Not recorded'}</span>
                          </div>
                          <div className={cn('flex items-center gap-1', rx.expired ? 'text-red-600' : 'text-muted-foreground')}>
                            <Calendar className="h-3 w-3" />
                            <span>Expires: {rx.expiryDate ? new Date(rx.expiryDate).toLocaleDateString() : 'Unknown'}</span>
                            {rx.expired && <span title="Expired"><AlertTriangle className="h-3 w-3" /></span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {rx.imageUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={rx.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-primary hover:text-primary/80"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No image</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {rx.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <Dialog open={selectedRx?.id === rx.id && action === 'reject'} onOpenChange={(open) => { if (!open) { setSelectedRx(null); setAction(null); setRejectReason(''); setCustomReason(''); } }}>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" onClick={() => { setSelectedRx(rx); setAction('reject'); }}>Reject</Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Reject prescription #{rx.id.slice(0, 8)}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="space-y-2">
                                    <Label className="font-medium">Rejection reason (required)</Label>
                                    <select
                                      value={rejectReason}
                                      onChange={(e) => { setRejectReason(e.target.value); setCustomReason(''); }}
                                      className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    {rejectReason === 'Other' && (
                                      <Textarea
                                        placeholder="Enter custom reason..."
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        className="min-h-[80px]"
                                        required
                                      />
                                    )}
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => { setSelectedRx(null); setAction(null); setRejectReason(''); setCustomReason(''); }}>Cancel</Button>
                                  <Button variant="destructive" onClick={handleAction} disabled={submitting || !rejectReason || (rejectReason === 'Other' && !customReason)}>
                                    {submitting ? 'Processing…' : 'Confirm Rejection'}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button variant="default" size="sm" onClick={() => { setSelectedRx(rx); setAction('approve'); }}>Approve</Button>
                          </div>
                        ) : (
                          <Badge variant="outline" className={STATUS_COLORS[rx.status] || ''}>
                            {rx.status}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection reasons reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Standard Rejection Reasons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {REJECTION_REASONS.map((r) => (
              <Badge key={r} variant="secondary">{r}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}