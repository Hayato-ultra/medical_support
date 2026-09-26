'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import {
  FileText, Plus, Trash2, Loader2, Lock, AlertTriangle, CheckCircle2,
  Clock, ArrowRight,
} from 'lucide-react'

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Awaiting pharmacist',
    className: 'border-amber-400 bg-amber-50 text-amber-800',
  },
  VERIFIED: {
    label: 'Verified',
    className: 'border-green-400 bg-green-50 text-green-800',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'border-red-400 bg-red-50 text-red-800',
  },
}

export default function PrescriptionsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PrescriptionsList />
    </Suspense>
  )
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function PrescriptionsList() {
  const { isAuthenticated, isLoading } = useAuth()
  const params = useSearchParams()
  const returnTo = params.get('returnTo')

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await fetch('/api/prescriptions/library')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load prescriptions')
      setItems(data.prescriptions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load prescriptions')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    load()
  }, [load])

  function use(prescriptionId: string) {
    if (returnTo === 'checkout') {
      sessionStorage.setItem('prescriptionId', prescriptionId)
    }
    window.location.href = '/checkout'
  }

  async function remove(id: string) {
    setBusy(id)
    setError('')
    try {
      const res = await fetch(`/api/prescriptions/library?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not remove')
      setItems((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove')
    } finally {
      setBusy(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <Lock className="mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="mb-2 text-xl font-semibold">Sign in to see your prescriptions</h1>
            <Button asChild>
              <Link href="/login?next=%2Fprescriptions">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">My prescriptions</h1>
            <p className="text-sm text-muted-foreground">
              Reuse a previous prescription instead of searching again.
            </p>
          </div>
          <Button size="sm" asChild>
            <Link href="/prescriptions/upload">
              <Plus className="mr-2 h-4 w-4" /> Upload
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6">
        {error && (
          <p className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-14 text-center">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-semibold">No saved prescriptions</h2>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                Upload a photo once and reuse it for every repeat order.
              </p>
              <Button asChild>
                <Link href="/prescriptions/upload">Upload your first prescription</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((p) => {
              const style = STATUS_STYLE[p.verificationStatus] ?? STATUS_STYLE.PENDING
              return (
                <Card key={p.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    {p.imageUrl && p.imageUrl.startsWith('/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt="Prescription"
                        className="h-20 w-20 shrink-0 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-muted">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.doctorName}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(p.createdAt).toLocaleDateString('en-IN')}
                        {p.expiryDate &&
                          ` · valid until ${new Date(p.expiryDate).toLocaleDateString('en-IN')}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className={style.className}>{style.label}</Badge>
                        {p.expired && (
                          <Badge className="border-red-400 bg-red-50 text-red-800">
                            Expired
                          </Badge>
                        )}
                      </div>
                      {p.expired && (
                        <p className="mt-2 text-xs text-amber-700">
                          This is older than 6 months. A pharmacist may ask for a
                          fresher photo.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => use(p.prescriptionId)}
                        disabled={p.verificationStatus === 'REJECTED'}
                      >
                        Use this <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-muted-foreground hover:text-red-600"
                        onClick={() => remove(p.id)}
                        disabled={busy === p.id}
                        aria-label="Delete prescription"
                      >
                        {busy === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {!loading && items.length > 0 && (
          <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A pharmacist typically verifies a new prescription within 15 minutes.
            Verified ones are ready to use immediately.
          </p>
        )}
      </main>
    </div>
  )
}
