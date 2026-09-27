import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export interface Actor {
  userId: string
  customerId: string
  riderId: string
  role: UserRole
  phone: string
}

export async function getActor(): Promise<Actor | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch user profile from users table
  const { data: profile, error } = await supabase
    .from('users')
    .select('role, phone, customer_id')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null

  let customerId = ''
  let riderId = ''

  if (profile.role === 'CUSTOMER') {
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (customer) customerId = customer.id
  }

  if (profile.role === 'RIDER') {
    const { data: rider } = await supabase
      .from('riders')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (rider) riderId = rider.id
  }

  return {
    userId: user.id,
    customerId,
    riderId,
    role: profile.role as UserRole,
    phone: profile.phone || '',
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
  const supabase = await createClient()
  const { data: staff } = await supabase
    .from('pharmacy_staff')
    .select('pharmacy_id')
    .eq('user_id', actor.userId)
    .single()
  return staff?.pharmacy_id ?? null
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
  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !order) {
    return {
      order: null,
      error: NextResponse.json({ error: 'Order not found' }, { status: 404 }),
    }
  }

  if (actor.role === 'CUSTOMER') {
    if (order.customer_id !== actor.customerId) {
      return { order: null, error: forbidden('This order belongs to another account') }
    }
    return { order, error: null }
  }

  if (actor.role === 'RIDER') {
    if (!order.rider_id) {
      return { order: null, error: forbidden('This delivery is not assigned to you') }
    }
    if (order.rider_id !== actor.riderId) {
      return { order: null, error: forbidden('This delivery is assigned to another rider') }
    }
    return { order, error: null }
  }

  if (hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
    const pharmacyId = await resolvePharmacyScope(actor)
    if (!pharmacyId || pharmacyId !== order.pharmacy_id) {
      return { order: null, error: forbidden('This order belongs to a different pharmacy') }
    }
    return { order, error: null }
  }

  return { order, error: null }
}