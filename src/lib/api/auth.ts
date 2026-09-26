import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db/client'
import type { UserRole } from '@/lib/auth/types'

export interface Actor {
  userId: string
  customerId: string
  riderId: string
  role: UserRole
  phone: string
}

export async function getActor(): Promise<Actor | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const role = session.user.role
  let customerId = ''
  let riderId = ''

  if (role === 'CUSTOMER') {
    const customer: any = await db.orm.Customer
      .where({ userId: session.user.id })
      .first()
    customerId = customer?.id ?? session.user.id
  }

  if (role === 'RIDER') {
    const rider: any = await db.orm.Rider
      .where({ userId: session.user.id })
      .first()
    riderId = rider?.id ?? ''
  }

  return {
    userId: session.user.id,
    customerId: customerId || session.user.customerId || session.user.id,
    riderId,
    role,
    phone: session.user.phone || '',
  }
}

export function unauthorized(message = 'Sign in to continue') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'You do not have access to this resource') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function hasRole(actor: Actor, ...roles: UserRole[]) {
  return roles.includes(actor.role)
}

export function isStaff(actor: Actor) {
  return hasRole(actor, 'ADMIN', 'PHARMACY_OWNER', 'PHARMACY_STAFF')
}

/** Pharmacy a staff actor belongs to, or null for admins (unscoped). */
export async function resolvePharmacyScope(actor: Actor): Promise<string | null> {
  if (actor.role === 'ADMIN') return null
  const staff: any = await db.orm.PharmacyStaff
    .where({ userId: actor.userId })
    .first()
  return staff?.pharmacyId ?? null
}

export interface AuthorizedOrder {
  order: any | null
  error: NextResponse | null
}

/** Loads an order and verifies the actor is allowed to see/act on it. */
export async function loadAuthorizedOrder(
  actor: Actor,
  orderId: string
): Promise<AuthorizedOrder> {
  const order: any = await db.orm.Order.where({ id: orderId }).first()
  if (!order) {
    return {
      order: null,
      error: NextResponse.json({ error: 'Order not found' }, { status: 404 }),
    }
  }

  if (actor.role === 'CUSTOMER') {
    if (order.customerId !== actor.customerId) {
      return { order: null, error: forbidden('This order belongs to another account') }
    }
    return { order, error: null }
  }

        if (actor.role === 'RIDER') {
          // An unassigned order is not the rider's to read: it still exposes the
          // customer's address, items and notes. Claiming a delivery is a
          // separate flow, not a side effect of holding a rider session.
          if (!order.riderId) {
            return { order: null, error: forbidden('This delivery is not assigned to you') }
          }
          if (order.riderId !== actor.riderId) {
            return { order: null, error: forbidden('This delivery is assigned to another rider') }
          }
          return { order, error: null }
        }

  if (hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
    const pharmacyId = await resolvePharmacyScope(actor)
    if (!pharmacyId || pharmacyId !== order.pharmacyId) {
      return { order: null, error: forbidden('This order belongs to a different pharmacy') }
    }
    return { order, error: null }
  }

  return { order, error: null }
}
