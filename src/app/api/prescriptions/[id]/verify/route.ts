import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'

/** Pharmacist decision on a prescription. Rejection triggers an auto-refund. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to review prescriptions')

  if (!hasRole(actor, 'ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
    return forbidden('Only pharmacists can verify prescriptions')
  }

  try {
    const { id } = await params
    const { status, notes } = await req.json().catch(() => ({}))

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be VERIFIED or REJECTED' },
        { status: 400 }
      )
    }
    if (status === 'REJECTED' && !notes) {
      return NextResponse.json(
        { error: 'Tell the customer why the prescription was rejected' },
        { status: 400 }
      )
    }

    const prescription: any = await db.orm.Prescription
      .where({ id })
      .first()

    if (!prescription) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }
    if (prescription.status !== 'PENDING') {
      return NextResponse.json(
        {
          error: `This prescription was already ${prescription.status.toLowerCase()}`,
        },
        { status: 409 }
      )
    }

    await db.orm.Prescription.where({ id }).update({
      status,
      verifiedBy: actor.userId,
      verifiedAt: new Date(),
      notes: notes || null,
    })

    // Move every order waiting on this prescription, and refund on rejection.
    const orders: any[] = await db.orm.Order
      .where({ prescriptionId: id, status: 'RX_PENDING' })
      .all()

    for (const order of orders) {
      if (status === 'VERIFIED') {
        await db.orm.Order.where({ id: order.id }).update({ status: 'CONFIRMED' })
        await db.orm.TrackingEvent.create({
          id: crypto.randomUUID(),
          orderId: order.id,
          status: 'CONFIRMED',
          timestamp: new Date(),
          notes: 'Prescription verified. Your order is being prepared.',
        })
      } else {
        await db.orm.Order.where({ id: order.id }).update({ status: 'RX_REJECTED' })
        await db.orm.TrackingEvent.create({
          id: crypto.randomUUID(),
          orderId: order.id,
          status: 'RX_REJECTED',
          timestamp: new Date(),
          notes: `Prescription rejected: ${notes}. Your refund is on the way.`,
        })

        const payment: any = await db.orm.Payment
          .where({ orderId: order.id })
          .first()
        if (payment && payment.status === 'COMPLETED') {
          await db.orm.Payment.where({ id: payment.id }).update({ status: 'REFUNDED' })
        }

        const items: any[] = await db.orm.OrderItem
          .where({ orderId: order.id })
          .all()
        for (const item of items) {
          const stock: any = await db.orm.Inventory
            .where({
              pharmacyId: order.pharmacyId,
              medicineId: item.medicineId,
            })
            .first()
          if (stock) {
            await db.orm.Inventory
              .where({ id: stock.id })
              .update({ quantity: stock.quantity + item.quantity })
          }
        }
      }
    }

    return NextResponse.json({
      status,
      ordersUpdated: orders.length,
      message:
        status === 'VERIFIED'
          ? 'Prescription verified. The customer has been notified.'
          : 'Prescription rejected. Affected orders were cancelled and refunded.',
    })
  } catch (err) {
    console.error('Prescription verification error:', err)
    return NextResponse.json(
      { error: 'Could not record this decision' },
      { status: 500 }
    )
  }
}
