import { randomInt, randomUUID } from 'crypto'
import { db } from '@/lib/db/client'

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
  CANCELLED: ['CUSTOMER', 'ADMIN', 'PHARMACY_OWNER'],
}

/**
 * Statuses that may only be reached once the money has actually been captured.
 * Without this an unpaid prescription order could be confirmed, packed and
 * dispatched, because the pharmacy never waits on the payment webhook.
 */
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

export function addTrackingEvent(
  orderId: string,
  status: string,
  notes?: string | null,
  location?: unknown
) {
  return db.orm.TrackingEvent.create({
    id: randomUUID(),
    orderId,
    status,
    timestamp: new Date(),
    notes: notes || FRIENDLY_MESSAGES[status] || null,
    location: location ?? null,
  })
}

/** Returns reserved stock to the pharmacy shelf when an order is abandoned. */
export async function releaseStock(orderId: string) {
  const items: any[] = await db.orm.OrderItem.where({ orderId }).all()
  const order: any = await db.orm.Order.where({ id: orderId }).first()
  if (!order) return

  for (const item of items) {
    const stock: any = await db.orm.Inventory
      .where({ pharmacyId: order.pharmacyId, medicineId: item.medicineId })
      .first()
    if (!stock) continue
    await db.orm.Inventory
      .where({ id: stock.id })
      .update({ quantity: stock.quantity + item.quantity })
  }
}

export async function setPaymentStatus(
  orderId: string,
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
) {
  const payment: any = await db.orm.Payment.where({ orderId }).first()
  if (!payment) return null
  return db.orm.Payment.where({ id: payment.id }).update({ status })
}

export function generateDeliveryOtp() {
  return String(randomInt(100000, 999999))
}

/**
 * Hands a packed order to an idle rider.
 *
 * Without this the rider dashboard stays permanently empty and delivery can
 * never be confirmed, because every rider-facing route requires the order to
 * already name them. Packing is the moment the parcel is ready to collect, so
 * that is where the rider is picked up and flagged as busy.
 *
 * "Available" is not the same as "idle": a rider freed from their last
 * delivery is available again, so a rider still holding an unfinished order is
 * skipped and the next free rider is used instead.
 *
 * Returns the assigned rider id, or null when nobody is free.
 */
export async function assignRider(order: any): Promise<string | null> {
  if (order.riderId) return String(order.riderId)

  const busyIds = new Set<string>()
  for (const status of ACTIVE_DELIVERY_STATUSES) {
    const active: any[] = await db.orm.Order.where({ status }).all()
    for (const o of active) {
      if (o.riderId) busyIds.add(String(o.riderId))
    }
  }

  const riders: any[] = await db.orm.Rider.where({ isAvailable: 1 }).all()
  const rider = riders.find((r) => !busyIds.has(String(r.id)))
  if (!rider) return null

  await db.orm.Rider.where({ id: rider.id }).update({ isAvailable: 0 })
  await db.orm.Order.where({ id: order.id }).update({ riderId: rider.id })
  await addTrackingEvent(
    order.id,
    'RIDER_ASSIGNED',
    `${rider.name} (${String(rider.vehicleType).toLowerCase()}) is collecting this order`
  )
  return String(rider.id)
}

/** Frees the rider again once the order no longer needs them. */
async function releaseRider(order: any) {
  if (!order.riderId) return
  await db.orm.Rider.where({ id: order.riderId }).update({ isAvailable: 1 })
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

  const payment: any = await db.orm.Payment.where({ orderId: order.id }).first()

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

  if (next === 'OUT_FOR_DELIVERY' && !order.deliveryOtp) {
    data.deliveryOtp = generateDeliveryOtp()
  }

  if (next === 'DELIVERED') {
    data.otpVerifiedAt = new Date()
  }

  const updated = await db.orm.Order.where({ id: order.id }).update(data)

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
    deliveryOtp: data.deliveryOtp ?? order.deliveryOtp ?? null,
  }
}
