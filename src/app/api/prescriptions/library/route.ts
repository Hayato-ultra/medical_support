import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden } from '@/lib/api/auth'

export async function GET(_req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to view your prescriptions')
  if (actor.role !== 'CUSTOMER') {
    return forbidden('Only customer accounts have a prescription library')
  }

  try {
    const entries: any[] = await db.orm.PrescriptionLibrary
      .where({ customerId: actor.customerId })
      .all()

    const now = Date.now()
    const items = await Promise.all(
      entries.map(async (entry) => {
        const prescription: any = await db.orm.Prescription
          .where({ id: entry.prescriptionId })
          .first()
        return {
          id: entry.id,
          prescriptionId: entry.prescriptionId,
          doctorName: entry.doctorName || 'Not recorded',
          expiryDate: entry.expiryDate,
          createdAt: entry.createdAt,
          verificationStatus: prescription?.status ?? 'PENDING',
          imageUrl: entry.imageUrl,
          expired: entry.expiryDate ? new Date(entry.expiryDate).getTime() < now : false,
        }
      })
    )

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ prescriptions: items, count: items.length })
  } catch (err) {
    console.error('Prescription library fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load your saved prescriptions' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to manage your prescriptions')

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const entry: any = await db.orm.PrescriptionLibrary.where({ id }).first()
    if (!entry) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }
    if (entry.customerId !== actor.customerId) {
      return forbidden('That prescription belongs to another account')
    }

    const inUse: any[] = await db.orm.Order
      .where({ prescriptionId: entry.prescriptionId })
      .all()
    const activeOrder = inUse.find((o) =>
      !['DELIVERED', 'CANCELLED', 'RX_REJECTED'].includes(String(o.status))
    )
    if (activeOrder) {
      return NextResponse.json(
        {
          error: `This prescription is attached to order ${activeOrder.orderNumber}. Wait until it is delivered or cancel that order first.`,
        },
        { status: 409 }
      )
    }

    await db.orm.PrescriptionLibrary.where({ id }).delete()

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('Prescription library delete error:', err)
    return NextResponse.json(
      { error: 'Could not remove this prescription' },
      { status: 500 }
    )
  }
}
