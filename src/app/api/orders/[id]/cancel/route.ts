import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'
import { applyTransition } from '@/lib/api/order-lifecycle'

/** Cancellation is free until the pharmacy starts packing. */
const FREE_CANCEL_UNTIL = ['PENDING', 'PENDING_PAYMENT', 'RX_PENDING', 'CONFIRMED', 'ACCEPTED']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to cancel an order')

  try {
    const supabase = createReadOnlyApiClient()
    const { id } = await params
    const { reason } = await req.json().catch(() => ({}))

    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const status = String(order.status)

    if (status === 'DELIVERED' || status === 'CANCELLED') {
      return NextResponse.json(
        { error: `This order is already ${status.toLowerCase()}` },
        { status: 400 }
      )
    }

    if (status === 'OUT_FOR_DELIVERY') {
      return NextResponse.json(
        {
          error: 'Your rider is already on the way and cannot be recalled.',
          supportRequired: true,
        },
        { status: 409 }
      )
    }

    const wasCharged = !FREE_CANCEL_UNTIL.includes(status)
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', order.id)
      .single()
    const actuallyCharged = !!payment && payment.status === 'COMPLETED'

    const result = await applyTransition(order, 'CANCELLED', {
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled by customer',
    })

    if (result.error) {
      return NextResponse.json(result.error, { status: 400 })
    }

    return NextResponse.json({
      cancelled: true,
      refundInitiated: wasCharged && actuallyCharged,
      amount:
        wasCharged && actuallyCharged ? String(payment.amount) : '0',
      message:
        wasCharged && actuallyCharged
          ? 'Order cancelled. Your refund is on its way in 3–5 days.'
          : 'Order cancelled. Nothing was charged.',
    })
  } catch (err) {
    console.error('Cancel order error:', err)
    return NextResponse.json(
      { error: 'Could not cancel this order' },
      { status: 500 }
    )
  }
}