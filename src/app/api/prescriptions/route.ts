import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, forbidden, hasRole, resolvePharmacyScope } from '@/lib/api/auth'

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to upload a prescription')

  try {
    const supabase = createReadOnlyApiClient()
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

    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .insert({
        id: randomUUID(),
        customer_id: actor.customerId,
        image_url: imageUrl,
        verified_by: null,
        verified_at: null,
        status: 'PENDING',
        notes: notes || null,
      })
      .select()
      .single()

    if (rxError) throw rxError

    await supabase
      .from('prescription_library')
      .insert({
        id: randomUUID(),
        customer_id: actor.customerId,
        prescription_id: prescription.id,
        image_url: imageUrl,
        doctor_name: doctorName || null,
        expiry_date: new Date(issuedAt.getTime() + SIX_MONTHS_MS).toISOString(),
        status: olderThanSixMonths ? 'EXPIRED' : 'ACTIVE',
      })

    return NextResponse.json(
      {
        prescription: {
          id: prescription.id,
          status: prescription.status,
          createdAt: prescription.created_at,
        },
        expired: olderThanSixMonths,
        warnings: olderThanSixMonths
          ? ['This prescription is older than 6 months. A pharmacist may ask for a fresher copy.']
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
    const supabase = createReadOnlyApiClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    let prescriptions: any[] = []

    if (actor.role === 'CUSTOMER') {
      let query = supabase.from('prescriptions').select('*').eq('customer_id', actor.customerId)
      if (status) query = query.eq('status', status)
      const { data } = await query
      prescriptions = data || []
    } else if (hasRole(actor, 'ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
      if (actor.role === 'ADMIN') {
        let query = supabase.from('prescriptions').select('*')
        if (status) query = query.eq('status', status)
        else query = query.eq('status', 'PENDING')
        const { data } = await query
        prescriptions = data || []
      } else {
        const pharmacyId = await resolvePharmacyScope(actor)
        if (!pharmacyId) {
          return NextResponse.json({ prescriptions: [], count: 0 })
        }
        const { data: orders } = await supabase
          .from('orders')
          .select('prescription_id')
          .eq('pharmacy_id', pharmacyId)
        const ids = [...new Set((orders || []).map((o) => o.prescription_id).filter(Boolean))]
        if (ids.length === 0) {
          return NextResponse.json({ prescriptions: [], count: 0 })
        }
        const scoped: any[] = []
        for (const id of ids) {
          const { data: found } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('id', id)
            .single()
          if (found) scoped.push(found)
        }
        return NextResponse.json({
          prescriptions: await enrichPrescriptions(scoped, actor, status),
          count: scoped.length,
        })
      }
    } else {
      return forbidden('You cannot view prescriptions')
    }

    return NextResponse.json({
      prescriptions: await enrichPrescriptions(prescriptions, actor, status),
      count: prescriptions.length,
    })
  } catch (err) {
    console.error('Prescription fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load your prescriptions' },
      { status: 500 }
    )
  }
}

async function enrichPrescriptions(
  prescriptions: any[],
  actor: Awaited<ReturnType<typeof getActor>> & {},
  status?: string | null
) {
  const supabase = createReadOnlyApiClient()
  const canSeeImage =
    actor.role === 'CUSTOMER' ||
    actor.role === 'ADMIN' ||
    hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')

  const enriched = await Promise.all(
    prescriptions.map(async (p) => {
      const { data: entry } = await supabase
        .from('prescription_library')
        .select('*')
        .eq('prescription_id', p.id)
        .single()
      return {
        id: p.id,
        customerId: p.customer_id,
        status: status && actor.role === 'CUSTOMER' ? status : p.status,
        notes: p.notes || '',
        verifiedBy: p.verified_by || null,
        verifiedAt: p.verified_at,
        createdAt: p.created_at,
        imageUrl: canSeeImage ? p.image_url : undefined,
        doctorName: entry?.doctor_name || 'Not recorded',
        expiryDate: entry?.expiry_date || null,
        expired: entry?.expiry_date ? new Date(entry.expiry_date) < new Date() : false,
      }
    })
  )

  enriched.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return enriched
}

async function storePrescriptionFile(buffer: Buffer, upload: File) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  const filename = `${randomUUID()}-${upload.name.replace(/[^\w.-]/g, '_')}`

  if (token) {
    const { put } = await import('@vercel/blob')
    try {
      const blob = await put(`prescriptions/${filename}`, buffer, {
        access: 'private',
        token,
        contentType: upload.type,
        addRandomSuffix: false,
      })
      return blob.url
    } catch (err) {
      console.error(
        '[prescriptions] Vercel Blob put failed, falling back to local storage. Check BLOB_READ_WRITE_TOKEN.',
        err
      )
    }
  }

  const { promises: fs } = await import('fs')
  const path = await import('path')
  const dir = path.join(process.cwd(), '.uploads', 'prescriptions')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, filename), buffer)
  return `/api/uploads/${filename}`
}
