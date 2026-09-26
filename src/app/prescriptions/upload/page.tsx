'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  Camera, Upload, ImageIcon, Trash2, CheckCircle2, AlertTriangle,
  Loader2, Lock, ArrowRight,
} from 'lucide-react'

const MAX_BYTES = 8 * 1024 * 1024

export default function PrescriptionUploadPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PrescriptionUploadForm />
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

function PrescriptionUploadForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { isAuthenticated, isLoading } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [doctorName, setDoctorName] = useState('')
  const [prescriptionDate, setPrescriptionDate] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const returnTo = params.get('returnTo')

  useEffect(() => {
    return () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

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
            <h1 className="mb-2 text-xl font-semibold">Sign in to upload</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              We keep your prescriptions private to your account, so we need to know who you are.
            </p>
            <Button asChild>
              <Link href={`/login?next=${encodeURIComponent('/prescriptions/upload')}`}>
                Sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <CheckCircle2 className="mb-4 h-14 w-14 text-green-600" />
            <h1 className="mb-2 text-xl font-semibold">Prescription uploaded</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              A pharmacist usually verifies it within 15 minutes. We will text you
              as soon as it clears.
            </p>
            <div className="flex w-full flex-col gap-2">
              <Button asChild>
                <Link href="/checkout">Back to checkout</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/prescriptions">My prescriptions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function pick(selected: File | null) {
    setError('')
    if (!selected) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(selected.type)) {
      setError('Use a JPG, PNG, WEBP or PDF file')
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('That file is larger than 8 MB. Retake the photo closer to the page.')
      return
    }
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    setFile(selected)
    setPreview(selected.type === 'application/pdf' ? '' : URL.createObjectURL(selected))
  }

  async function upload() {
    if (!file) {
      setError('Choose or take a photo of your prescription first')
      return
    }
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('image', file)
      if (doctorName) body.append('doctorName', doctorName)
      if (prescriptionDate) body.append('prescriptionDate', prescriptionDate)
      if (notes) body.append('notes', notes)

      const res = await fetch('/api/prescriptions', { method: 'POST', body })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      if (returnTo === 'checkout') {
        sessionStorage.setItem('prescriptionId', data.prescription.id)
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="border-b bg-background">
        <div className="container mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={returnTo === 'checkout' ? '/checkout' : '/'}>
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Upload prescription</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Photo of your prescription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="mb-2 h-6 w-6" />
                  Take photo
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon className="mb-2 h-6 w-6" />
                  Choose file
                </Button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />

              {preview ? (
                <div className="relative overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Prescription preview" className="max-h-72 w-full object-contain" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => {
                      URL.revokeObjectURL(preview)
                      setPreview('')
                      setFile(null)
                    }}
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : file ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB PDF
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Keep the whole page in frame, make sure the doctor name and date
                  are readable, and avoid glare.
                </div>
              )}

              {error && (
                <p className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <Button className="w-full" size="lg" disabled={!file || uploading} onClick={upload}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    Upload prescription <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Details (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="doctor">Doctor name</Label>
                <Input
                  id="doctor"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Dr. Sharma"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rxdate">Prescription date</Label>
                <Input
                  id="rxdate"
                  type="date"
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rxnotes">Notes for the pharmacist</Label>
                <Textarea
                  id="rxnotes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, preferred brand…"
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Prescriptions older than 6 months are flagged. We never share them
                outside your order.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
