import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to upload a prescription')

  try {
    const form = await req.formData().catch(() => null)
    if (!form) {
      return NextResponse.json(
        { error: 'Send the prescription as multipart form data' },
        { status: 400 }
      )
    }

    const doctorName = String(form.get('doctorName') || '').trim()
    const notes = String(form.get('notes') || '').trim()
    const prescriptionDate = String(form.get('prescriptionDate') || '')
    const file = form.get('image')

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'Attach a photo of your prescription' },
        { status: 400 }
      )
    }

    const upload = file as File
    if (!ALLOWED_TYPES.includes(upload.type)) {
      return NextResponse.json(
        { error: 'Upload a JPG, PNG, WEBP or PDF file' },
        { status: 400 }
      )
    }
    if (upload.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'File is larger than 8 MB. Please retake the photo.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await upload.arrayBuffer())
    const imageUrl = await storePrescriptionFile(buffer, upload)

    const issuedAt = prescriptionDate ? new Date(prescriptionDate) : new Date()
    if (Number.isNaN(issuedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid prescription date' }, { status: 400 })
    }
    const olderThanSixMonths = Date.now() - issuedAt.getTime() > SIX_MONTHS_MS

    const prescription: any = await db.orm.Prescription.create({
      id: randomUUID(),
      customerId: actor.customerId,
      imageUrl,
      verifiedBy: null,
      verifiedAt: null,
      status: 'PENDING',
      notes: notes || null,
    })

    await db.orm.PrescriptionLibrary.create({
      id: randomUUID(),
      customerId: actor.customerId,
      prescriptionId: prescription.id,
      imageUrl,
      doctorName: doctorName || null,
      expiryDate: new Date(issuedAt.getTime() + SIX_MONTHS_MS),
      status: olderThanSixMonths ? 'EXPIRED' : 'ACTIVE',
    })

    return NextResponse.json(
      {
        prescription: {
          id: prescription.id,
          status: prescription.status,
          createdAt: prescription.createdAt,
        },
        expired: olderThanSixMonths,
        warnings: olderThanSixMonths
          ? [
              'This prescription is older than 6 months. A pharmacist may ask for a fresher copy.',
            ]
          : [],
        message: olderThanSixMonths
          ? 'Uploaded, but it looks older than 6 months. Upload a fresher copy if you can.'
          : 'Uploaded. Our pharmacist usually verifies it within 15 minutes.',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Prescription upload error:', err)
    return NextResponse.json(
      { error: 'Could not upload your prescription. Try again.' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to view your prescriptions')

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const where: any = {}
    if (actor.role === 'CUSTOMER') {
      where.customerId = actor.customerId
    } else if (hasRole(actor, 'ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
      // Staff see the verification queue, customers see their own uploads.
      if (status) where.status = status
      else where.status = 'PENDING'
    } else {
      return forbidden('You cannot view prescriptions')
    }

    if (actor.role === 'CUSTOMER' && status) where.status = status

    const prescriptions: any[] = await db.orm.Prescription.where(where).all()

    const enriched = await Promise.all(
      prescriptions.map(async (p) => {
        const entry: any = await db.orm.PrescriptionLibrary
          .where({ prescriptionId: p.id })
          .first()
        return {
          id: p.id,
          status: p.status,
          notes: p.notes || '',
          verifiedAt: p.verifiedAt,
          createdAt: p.createdAt,
          imageUrl: actor.role === 'CUSTOMER' ? p.imageUrl : undefined,
          doctorName: entry?.doctorName || 'Not recorded',
          expiryDate: entry?.expiryDate || null,
          expired: entry?.expiryDate ? new Date(entry.expiryDate) < new Date() : false,
        }
      })
    )

    enriched.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ prescriptions: enriched, count: enriched.length })
  } catch (err) {
    console.error('Prescription fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load your prescriptions' },
      { status: 500 }
    )
  }
}

/**
 * Stores the upload in Vercel Blob when credentials are present, otherwise
 * writes to local private storage so development still works end to end.
 */
async function storePrescriptionFile(buffer: Buffer, upload: File) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const filename = `${randomUUID()}-${upload.name.replace(/[^\w.-]/g, '_')}`

  if (token) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`prescriptions/${filename}`, buffer, {
      access: 'private',
      token,
      contentType: upload.type,
      addRandomSuffix: false,
    })
    return blob.url
  }

  const { promises: fs } = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), '.uploads', 'prescriptions')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, filename), buffer)
  return `/api/uploads/${filename}`
}
