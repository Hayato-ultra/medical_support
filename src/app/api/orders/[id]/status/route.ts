import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, loadAuthorizedOrder, hasRole } from '@/lib/api/auth'
import { applyTransition, TRANSITION_ROLES } from '@/lib/api/order-lifecycle'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to update an order')

  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { status, notes, location } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (status === 'DELIVERED') {
      return forbidden('Confirm delivery with the customer code instead')
    }

    const allowedRoles = TRANSITION_ROLES[status] || []
    if (!allowedRoles.includes(actor.role)) {
      return forbidden(`A ${actor.role.toLowerCase().replace(/_/g, ' ')} cannot set this status`)
    }

    // Customers can only cancel; everything else is staff or rider work.
    if (actor.role === 'CUSTOMER' && status !== 'CANCELLED') {
      return forbidden('Customers can only cancel an order')
    }

    const result = await applyTransition(order, status, {
      notes: notes || null,
      location: location || null,
      actorId: actor.userId,
    })

    if (result.error) {
      return NextResponse.json(result.error, { status: 400 })
    }

    return NextResponse.json({
      order: result.order,
      status: status,
      deliveryOtp: status === 'OUT_FOR_DELIVERY' ? result.deliveryOtp : undefined,
      message:
        status === 'OUT_FOR_DELIVERY'
          ? 'Picked up. Ask the customer for the 6-digit delivery code.'
          : 'Order updated',
    })
  } catch (err) {
    console.error('Status update error:', err)
    return NextResponse.json(
      { error: 'Could not update the order' },
      { status: 500 }
    )
  }
}
