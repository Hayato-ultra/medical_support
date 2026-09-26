'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileUp, CheckCircle } from 'lucide-react'

export function PrescriptionUpload() {
  const { isAuthenticated, user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  const handleUpload = async () => {
    if (!file || !isAuthenticated) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('customerId', user!.id)

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setUploaded(true)
        setFile(null)
      }
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          Sign in to upload prescriptions
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Prescription
        </CardTitle>
        <CardDescription>Upload a JPEG, PNG, or PDF of your prescription</CardDescription>
      </CardHeader>
      <CardContent>
        {uploaded ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>Prescription uploaded successfully</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Select File</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              <FileUp className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Prescription'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
