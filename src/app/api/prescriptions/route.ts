import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const PrescriptionSchema = z.object({
  customerId: z.string(),
  imageUrl: z.string(),
  notes: z.string().optional(),
})

const VerifySchema = z.object({
  prescriptionId: z.string(),
  verifiedBy: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = PrescriptionSchema.parse(body)

    const prescription = await db.orm.Prescription.create({
      customerId: data.customerId,
      imageUrl: data.imageUrl,
      status: 'PENDING',
      notes: data.notes,
    })

    return NextResponse.json({ prescription }, { status: 201 })
  } catch (error) {
    console.error('Prescription upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload prescription' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId') || undefined

    const where: any = {}
    if (customerId) where.customerId = customerId

    const prescriptions = await db.orm.Prescription.where(where).all()
    return NextResponse.json({ prescriptions })
  } catch (error) {
    console.error('Prescription fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prescriptions' },
      { status: 500 }
    )
  }
}
