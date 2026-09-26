import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'

/** Only an unpaid order can start a payment. RX_PENDING already captured money. */
const PAYABLE = ['PENDING_PAYMENT']

export async function POST(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to pay for an order')

  try {
    const { orderId } = await req.json().catch(() => ({}))
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const { order, error } = await loadAuthorizedOrder(actor, orderId)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (!PAYABLE.includes(String(order.status))) {
      return NextResponse.json(
        { error: `Order is ${order.status} and is not awaiting payment` },
        { status: 409 }
      )
    }

    const payment: any = await db.orm.Payment.where({ orderId }).first()
    if (payment && payment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This order is already paid' },
        { status: 409 }
      )
    }

    const intentId = `pay_${randomUUID().replace(/-/g, '').slice(0, 20)}`

    await db.orm.Order.where({ id: orderId }).update({ paymentIntentId: intentId })

    if (payment && payment.status === 'FAILED') {
      await db.orm.Payment.where({ id: payment.id }).update({ status: 'PENDING' })
    }

    return NextResponse.json({
      intentId,
      amount: Number(order.totalAmount),
      currency: 'INR',
      orderNumber: order.orderNumber,
      expiresInMinutes: 15,
      needsPrescription: !!order.prescriptionId,
      methods: ['upi', 'card', 'netbanking', 'wallet'],
      message: order.prescriptionId
        ? 'Pay now. Our pharmacist starts verifying your prescription immediately — the pharmacy only starts packing once it clears.'
        : 'Complete payment within 15 minutes to hold your items.',
    })
  } catch (err) {
    console.error('Create intent error:', err)
    return NextResponse.json(
      { error: 'Could not start payment' },
      { status: 500 }
    )
  }
}
