import { randomInt, randomUUID } from 'crypto'
import { createApiClient } from '@/lib/supabase/api-client'

/**
 * Allowed order state machine.
 * Anything not listed here is rejected, so a stale dashboard tab can never
 * push an order backwards (e.g. DELIVERED -> PACKED).
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['RX_PENDING', 'CONFIRMED', 'CANCELLED'],
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  RX_PENDING: ['CONFIRMED', 'RX_REJECTED', 'CANCELLED'],
  RX_REJECTED: ['CANCELLED'],
  CONFIRMED: ['ACCEPTED', 'RX_REJECTED', 'CANCELLED'],
  ACCEPTED: ['PACKING', 'CANCELLED'],
  PACKING: ['PACKED', 'CANCELLED'],
  PACKED: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
}

/**
 * Statuses where a rider still owes the customer a delivery. Used to spot idle
 * riders, so a rider holding an unfinished job is not handed another one while
 * somebody else is free.
 */
const ACTIVE_DELIVERY_STATUSES = [
  'PACKED',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
]

export const FRIENDLY_MESSAGES: Record<string, string> = {
  PENDING: 'Order placed. We are confirming stock.',
  PENDING_PAYMENT: 'Order created. Complete payment to confirm.',
  RX_PENDING: 'Order placed. We are verifying your prescription — usually ~15 minutes.',
  CONFIRMED: 'Prescription verified. Your order is being prepared.',
  RX_REJECTED: 'We could not verify your prescription. Your money is on the way back.',
  ACCEPTED: 'The pharmacy accepted your order.',
  PACKING: 'Your order is being packed.',
  PACKED: 'Your order is packed.',
  READY_FOR_PICKUP: 'Your order is ready for pickup.',
  OUT_FOR_DELIVERY: 'Your order is on the way.',
  DELIVERED: 'Delivered. Hope you feel better soon.',
  CANCELLED: 'Your order was cancelled and refunded.',
}

/** Which roles may drive each transition. */
export const TRANSITION_ROLES: Record<string, string[]> = {
  CONFIRMED: ['ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
  RX_REJECTED: ['ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
  ACCEPTED: ['ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
  PACKING: ['ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
  PACKED: ['ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
  READY_FOR_PICKUP: ['ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
  OUT_FOR_DELIVERY: ['RIDER', 'ADMIN'],
  // DELIVERED is intentionally absent: it is only reachable through
  // /verify-delivery, which checks the customer's 6-digit code.
  // CANCELLED doubles as "pharmacy declined this order", so staff need it too.
  // The refund always goes to the customer, never out of the pharmacy's side.
  CANCELLED: ['CUSTOMER', 'ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF'],
}

/** Statuses that may only be reached once the money has actually been captured. */
const REQUIRES_CAPTURED_PAYMENT = new Set([
  'CONFIRMED',
  'ACCEPTED',
  'PACKING',
  'PACKED',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
])

export function canTransition(current: string, next: string) {
  return (ALLOWED_TRANSITIONS[current] || []).includes(next)
}

async function getSupabase() {
  const { createApiClient } = await import('@/lib/supabase/api-client')
  return await createApiClient()
}

export async function addTrackingEvent(
  orderId: string,
  status: string,
  notes?: string | null,
  location?: unknown
) {
  const supabase = await getSupabase()
  return supabase.from('tracking_events').insert({
    id: randomUUID(),
    order_id: orderId,
    status,
    timestamp: new Date().toISOString(),
    notes: notes || FRIENDLY_MESSAGES[status] || null,
    location: location ?? null,
  })
}

/** Returns reserved stock to the pharmacy shelf when an order is abandoned. */
export async function releaseStock(orderId: string) {
  const supabase = await getSupabase()
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
  const { data: order } = await supabase
    .from('orders')
    .select('pharmacy_id')
    .eq('id', orderId)
    .single()
  if (!order) return

  for (const item of items || []) {
    const { data: stock } = await supabase
      .from('inventory')
      .select('*')
      .eq('pharmacy_id', order.pharmacy_id)
      .eq('medicine_id', item.medicine_id)
      .single()
    if (!stock) continue
    await supabase
      .from('inventory')
      .update({ quantity: stock.quantity + item.quantity })
      .eq('id', stock.id)
  }
}

export async function setPaymentStatus(
  orderId: string,
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
) {
  const supabase = await getSupabase()
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .single()
  if (!payment) return null
  return supabase
    .from('payments')
    .update({ status })
    .eq('id', payment.id)
}

export function generateDeliveryOtp() {
  return String(randomInt(100000, 999999))
}

/** Hands a packed order to an idle rider. */
export async function assignRider(order: any): Promise<string | null> {
  const supabase = await getSupabase()
  if (order.rider_id) return String(order.rider_id)

  const busyIds = new Set<string>()
  for (const status of ACTIVE_DELIVERY_STATUSES) {
    const { data: active } = await supabase
      .from('orders')
      .select('rider_id')
      .eq('status', status)
    for (const o of active || []) {
      if (o.rider_id) busyIds.add(String(o.rider_id))
    }
  }

  const { data: riders } = await supabase
    .from('riders')
    .select('*')
    .eq('is_available', true)
  const rider = (riders || []).find((r) => !busyIds.has(String(r.id)))
  if (!rider) return null

  await supabase
    .from('riders')
    .update({ is_available: false })
    .eq('id', rider.id)
  await supabase
    .from('orders')
    .update({ rider_id: rider.id })
    .eq('id', order.id)
  await addTrackingEvent(
    order.id,
    'RIDER_ASSIGNED',
    `${rider.name} (${String(rider.vehicle_type).toLowerCase()}) is collecting this order`
  )
  return String(rider.id)
}

/** Frees the rider again once the order no longer needs them. */
async function releaseRider(order: any) {
  const supabase = await getSupabase()
  if (!order.rider_id) return
  await supabase
    .from('riders')
    .update({ is_available: true })
    .eq('id', order.rider_id)
}

/** Full transition: validates, updates, logs, and handles side effects. */
export async function applyTransition(
  order: any,
  next: string,
  opts: {
    notes?: string | null
    location?: unknown
    actorId?: string
    /** Set by the delivery-code check; DELIVERED is rejected without it. */
    deliveryOtpVerified?: boolean
  } = {}
) {
  const current = String(order.status)
  if (!canTransition(current, next)) {
    return {
      error: {
        message: `Cannot move order from ${current} to ${next}`,
        allowed: ALLOWED_TRANSITIONS[current] || [],
      },
    }
  }

  // Delivery is only reachable through the route that checks the customer code,
  // otherwise a rider could self-confirm a handover.
  if (next === 'DELIVERED' && !opts.deliveryOtpVerified) {
    return {
      error: {
        message: 'Delivery must be confirmed with the customer delivery code',
      },
    }
  }

  const supabase = await getSupabase()
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', order.id)
    .single()

  // Don't let work start on an order whose payment never captured. Orders with
  // no payment row at all predate the payment flow and are left alone.
  if (REQUIRES_CAPTURED_PAYMENT.has(next) && payment && payment.status !== 'COMPLETED') {
    return {
      error: {
        message: `Payment is ${String(payment.status).toLowerCase()}, so this order cannot move to ${next}`,
        paymentStatus: payment.status,
      },
    }
  }

  const data: any = { status: next }

  if (next === 'OUT_FOR_DELIVERY' && !order.delivery_otp) {
    data.delivery_otp = generateDeliveryOtp()
  }

  if (next === 'DELIVERED') {
    data.otp_verified_at = new Date().toISOString()
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update(data)
    .eq('id', order.id)
    .select()
    .single()

  if (error) return { error: { message: error.message } }

  await addTrackingEvent(order.id, next, opts.notes, opts.location)

  // The parcel is ready to collect, so give it to a rider now.
  if (next === 'PACKED') {
    await assignRider({ ...order, ...updated })
  }

  if (next === 'RX_REJECTED' || next === 'CANCELLED') {
    await releaseStock(order.id)
    // Only money that was actually captured can be given back.
    if (payment?.status === 'COMPLETED') {
      await setPaymentStatus(order.id, 'REFUNDED')
    }
  }

  if (next === 'DELIVERED' || next === 'CANCELLED') {
    await releaseRider({ ...order, ...updated })
  }

  return {
    error: null,
    order: updated,
    deliveryOtp: data.delivery_otp ?? order.delivery_otp ?? null,
  }
}