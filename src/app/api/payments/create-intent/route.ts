import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'

/** Only an unpaid order can start a payment. RX_PENDING already captured money. */
const PAYABLE = ['PENDING_PAYMENT']

export async function POST(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to pay for an order')

  try {
    const supabase = createReadOnlyApiClient()
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

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single()
    if (payment && payment.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This order is already paid' },
        { status: 409 }
      )
    }

    const intentId = `pay_${randomUUID().replace(/-/g, '').slice(0, 20)}`

    await supabase
      .from('orders')
      .update({ payment_intent_id: intentId })
      .eq('id', orderId)

    if (payment && payment.status === 'FAILED') {
      await supabase
        .from('payments')
        .update({ status: 'PENDING' })
        .eq('id', payment.id)
    }

    return NextResponse.json({
      intentId,
      amount: Number(order.total_amount),
      currency: 'INR',
      orderNumber: order.order_number,
      expiresInMinutes: 15,
      needsPrescription: !!order.prescription_id,
      methods: ['upi', 'card', 'netbanking', 'wallet'],
      message: order.prescription_id
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
