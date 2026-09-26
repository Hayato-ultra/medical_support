import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, loadAuthorizedOrder, hasRole } from '@/lib/api/auth'
import { applyTransition } from '@/lib/api/order-lifecycle'

/**
 * Rider-side: the rider types in the 6-digit code shown in the customer's app.
 * The customer never has to read anything out loud to a stranger's phone.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to confirm delivery')

  if (!hasRole(actor, 'RIDER', 'ADMIN')) {
    return forbidden('Only the assigned rider can confirm delivery')
  }

  try {
    const { id } = await params
    const { otp } = await req.json().catch(() => ({}))

    if (!otp) {
      return NextResponse.json({ error: 'Enter the delivery code' }, { status: 400 })
    }

    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.status === 'DELIVERED') {
      return NextResponse.json({ verified: true, message: 'Order already delivered' })
    }

    if (order.status !== 'OUT_FOR_DELIVERY') {
      return NextResponse.json(
        { verified: false, error: 'This order has not been picked up yet' },
        { status: 409 }
      )
    }

    if (!order.deliveryOtp) {
      return NextResponse.json(
        { verified: false, error: 'No delivery code was issued for this order' },
        { status: 400 }
      )
    }

    if (String(order.deliveryOtp) !== String(otp).trim()) {
      return NextResponse.json(
        {
          verified: false,
          error: 'That code does not match. Ask the customer to check their app.',
        },
        { status: 400 }
      )
    }

    const result = await applyTransition(order, 'DELIVERED', {
      notes: 'Delivery confirmed with the customer code',
      deliveryOtpVerified: true,
    })

    if (result.error) {
      return NextResponse.json(result.error, { status: 400 })
    }

    return NextResponse.json({
      verified: true,
      message: 'Delivered.',
    })
  } catch (err) {
    console.error('Delivery OTP verify error:', err)
    return NextResponse.json(
      { verified: false, error: 'Could not verify the code' },
      { status: 500 }
    )
  }
}
