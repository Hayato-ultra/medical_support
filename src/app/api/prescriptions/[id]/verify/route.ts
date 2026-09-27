import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'
import { applyTransition } from '@/lib/api/order-lifecycle'

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
    const supabase = createReadOnlyApiClient()
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

    const { data: prescription, error: rxError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (rxError || !prescription) {
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

    await supabase
      .from('prescriptions')
      .update({
        status,
        verified_by: actor.userId,
        verified_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', id)

    // Move every order waiting on this prescription, and refund on rejection.
    // This goes through the shared lifecycle so the captured-payment gate, the
    // stock release and the refund all behave exactly as they do elsewhere.
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('prescription_id', id)
      .eq('status', 'RX_PENDING')

    const stuck: string[] = []
    for (const order of orders || []) {
      const result = await applyTransition(
        order,
        status === 'VERIFIED' ? 'CONFIRMED' : 'RX_REJECTED',
        {
          actorId: actor.userId,
          notes:
            status === 'VERIFIED'
              ? 'Prescription verified. Your order is being prepared.'
              : `Prescription rejected: ${notes}. Your refund is on the way.`,
        }
      )
      if (result.error) stuck.push(String(order.order_number))
    }

    return NextResponse.json({
      status,
      ordersUpdated: (orders?.length || 0) - stuck.length,
      stuckOrders: stuck,
      message:
        status === 'VERIFIED'
          ? stuck.length
            ? `Prescription verified, but ${stuck.length} order(s) could not be confirmed: ${stuck.join(', ')}.`
            : 'Prescription verified. The customer has been notified.'
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