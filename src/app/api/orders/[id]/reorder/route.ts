import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to reorder')

  try {
    const { id } = await params
    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const rows: any[] = await db.orm.OrderItem.where({ orderId: order.id }).all()

    const items = await Promise.all(
      rows.map(async (row) => {
        const medicine: any = await db.orm.Medicine
          .where({ id: row.medicineId })
          .first()
        return {
          medicineId: row.medicineId,
          name: medicine?.name ?? 'Medicine',
          price: Number(row.price),
          quantity: row.quantity,
          requiresPrescription: !!medicine?.requiresPrescription,
          available: !!medicine,
        }
      })
    )

    const unavailable = items.filter((i) => !i.available)

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      items,
      unavailable,
      prescriptionId: order.prescriptionId || null,
    })
  } catch (err) {
    console.error('Reorder fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load this order for reorder' },
      { status: 500 }
    )
  }
}
