import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const VerifySchema = z.object({
  prescriptionId: z.string(),
  status: z.enum(['VERIFIED', 'REJECTED']),
  verifiedBy: z.string(),
  notes: z.string().optional(),
})

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const prescriptionId = searchParams.get('prescriptionId') || ''
    const body = await req.json()
    const data = VerifySchema.parse(body)

    const updateData = {
      id: prescriptionId,
      status: data.status as any,
      verifiedBy: data.verifiedBy,
      verifiedAt: new Date().toISOString(),
      notes: data.notes,
    } as any
    // @ts-ignore
    await db.orm.Prescription.update(updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prescription verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify prescription' },
      { status: 500 }
    )
  }
}
