import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'

export async function GET() {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!hasRole(actor, 'ADMIN')) return forbidden('Admin only')

  try {
    const weekAgo = new Date(Date.now() - 604800000)
    const twoWeeksAgo = new Date(Date.now() - 1209600000)

    const ordersWeek: any[] = await db.orm.Order.where({ createdAt: { gte: weekAgo.toISOString() } }).all()
    const ordersTwoWeeks: any[] = await db.orm.Order.where({ createdAt: { gte: twoWeeksAgo.toISOString() } }).all()

    const eventsWeek: any[] = await db.orm.TrackingEvent.where({ createdAt: { gte: weekAgo.toISOString() } }).all()
    const eventsTwoWeeks: any[] = await db.orm.TrackingEvent.where({ createdAt: { gte: twoWeeksAgo.toISOString() } }).all()

    const pharmacies: any[] = await db.orm.Pharmacy.where({}).all()

    const health = pharmacies.map((p) => {
      const pOrders = ordersWeek.filter((o) => o.pharmacyId === p.id)
      const pEvents = eventsWeek.filter((e) => pOrders.some((o) => o.id === e.orderId))

      const acceptedEvents = pEvents.filter((e) => e.toStatus === 'ACCEPTED')
      const confirmedEvents = pEvents.filter((e) => e.fromStatus === 'CONFIRMED')
      const rejectedEvents = pEvents.filter((e) => e.fromStatus === 'CONFIRMED' && e.toStatus === 'CANCELLED' && e.actor === 'PHARMACY')

      const acceptRate = confirmedEvents.length
        ? (acceptedEvents.length / confirmedEvents.length) * 100
        : 100

      let avgAcceptMin = 0
      if (acceptedEvents.length > 0) {
        const totalMs = acceptedEvents.reduce((sum, e) => {
          const confirmed = eventsTwoWeeks.find((c) => c.orderId === e.orderId && c.toStatus === 'CONFIRMED')
          if (confirmed) return sum + (new Date(e.createdAt).getTime() - new Date(confirmed.createdAt).getTime())
          return sum
        }, 0)
        avgAcceptMin = Math.round(totalMs / acceptedEvents.length / 60000)
      }

      const rejectRate = confirmedEvents.length
        ? (rejectedEvents.length / confirmedEvents.length) * 100
        : 0

      // Score: A if acceptRate >= 95 && rejectRate <= 5 && avgAcceptMin <= 5
      // B if acceptRate >= 90 && rejectRate <= 10 && avgAcceptMin <= 10
      // C otherwise
      let score = 'C'
      if (acceptRate >= 95 && rejectRate <= 5 && avgAcceptMin <= 5) score = 'A'
      else if (acceptRate >= 90 && rejectRate <= 10 && avgAcceptMin <= 10) score = 'B'

      return {
        id: p.id,
        name: p.name,
        orders: pOrders.length,
        acceptRate,
        avgAcceptMin,
        score,
      }
    })

    return NextResponse.json({ pharmacies: health })
  } catch (err) {
    console.error('Pharmacy health error:', err)
    return NextResponse.json({ error: 'Could not load pharmacy health' }, { status: 500 })
  }
}