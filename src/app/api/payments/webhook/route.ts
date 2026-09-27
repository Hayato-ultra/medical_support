import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual, randomUUID } from 'crypto'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { addTrackingEvent } from '@/lib/api/order-lifecycle'

/**
 * Razorpay webhook receiver.
 *
 * The same endpoint also serves local development, where there is no gateway
 * to call back. Any request that presents a valid HMAC signature is treated as
 * a genuine gateway callback; unsigned requests are only honoured when
 * PAYMENTS_ALLOW_UNSIGNED is explicitly enabled, which must never be the case
 * in production.
 */
const ALLOW_UNSIGNED = process.env.PAYMENTS_ALLOW_UNSIGNED === '1'

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')

  if (!ALLOW_UNSIGNED && !verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    )
  }

  try {
    const supabase = createReadOnlyApiClient()
    const payload = JSON.parse(rawBody)
    const notes = payload?.payload?.notes ?? {}
    const orderId: string | undefined =
      notes.orderId ?? payload?.payload?.orderId ?? undefined
    const gatewayStatus: string = payload?.payload?.status ?? ''
    const method: string | undefined = payload?.payload?.method
    const transactionId: string | undefined = payload?.payload?.payment_entity?.id

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single()
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    // Idempotency: the gateway retries, so a settled payment is a no-op.
    if (payment.status === 'COMPLETED' && gatewayStatus === 'captured') {
      return NextResponse.json({ orderStatus: order.status, message: 'Already captured' })
    }

    if (gatewayStatus === 'captured' || gatewayStatus === 'authorized') {
      await supabase
        .from('payments')
        .update({
          status: 'COMPLETED',
          transaction_id: transactionId || `txn_${randomUUID().slice(0, 12)}`,
          payment_method: method || payment.payment_method || 'upi',
        })
        .eq('id', payment.id)

      // Payment is what promotes the order out of PENDING_PAYMENT: a
      // prescription order joins the pharmacist queue, everything else is
      // confirmed straight away.
      const nextStatus = order.prescription_id ? 'RX_PENDING' : 'CONFIRMED'
      const message = order.prescription_id
        ? 'Payment received. We are verifying your prescription — you will get an SMS once it is approved (usually ~15 minutes).'
        : 'Payment received. Your order is being prepared.'

      const advanced = order.status === 'PENDING_PAYMENT'
      if (advanced) {
        await supabase
          .from('orders')
          .update({ status: nextStatus })
          .eq('id', orderId)
        await addTrackingEvent(orderId, nextStatus, message)
      }

      return NextResponse.json({
        orderStatus: advanced ? nextStatus : order.status,
        awaitingPrescription: !!order.prescription_id,
        message,
      })
    }

    if (gatewayStatus === 'failed' || gatewayStatus === 'error') {
      await supabase
        .from('payments')
        .update({
          status: 'FAILED',
          payment_method: method || payment.payment_method || null,
        })
        .eq('id', payment.id)

      return NextResponse.json({
        orderStatus: order.status,
        retryWindowMinutes: 15,
        message:
          'Payment failed. Nothing was charged. You can retry payment for the next 15 minutes.',
      })
    }

    return NextResponse.json(
      { error: `Unsupported payment status: ${gatewayStatus}` },
      { status: 400 }
    )
  } catch (err) {
    console.error('Payment webhook error:', err)
    return NextResponse.json(
      { error: 'Payment processing failed' },
      { status: 500 }
    )
  }
}
