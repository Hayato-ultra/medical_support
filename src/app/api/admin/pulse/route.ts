import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'

export async function GET() {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!hasRole(actor, 'ADMIN')) return forbidden('Admin only')

  try {
    const hourAgo = new Date(Date.now() - 3600000)

    const recentEvents: any[] = await db.orm.TrackingEvent.where({
      timestamp: { gte: hourAgo.toISOString() },
    }).all()

    const recentOrders: any[] = await db.orm.Order.where({
      createdAt: { gte: hourAgo.toISOString() },
    }).all()

    const events = recentEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 25)
      .map((e) => {
        let type = 'other'
        let message = ''
        if (e.status === 'DELIVERED') { type = 'delivery'; message = `delivered to customer` }
        else if (e.status === 'OUT_FOR_DELIVERY') { type = 'delivery'; message = `out for delivery` }
        else if (e.status === 'PACKED') { type = 'delivery'; message = `packed, awaiting rider` }
        else if (e.status === 'CONFIRMED') { type = 'rx'; message = `prescription verified` }
        else if (e.status === 'RX_REJECTED') { type = 'rx'; message = `prescription rejected` }
        else if (e.status === 'RX_PENDING') { type = 'rx'; message = `new prescription` }
        else if (e.status === 'RIDER_ASSIGNED') { type = 'rider'; message = `rider assigned` }
        else if (e.status === 'ACCEPTED') { type = 'delivery'; message = `accepted by pharmacy` }
        else { message = e.status.toLowerCase().replace(/_/g, ' ') }
        return {
          id: e.id,
          type,
          orderId: e.orderId,
          createdAt: e.timestamp,
          message,
        }
      })

    // Add stuck orders
    const activeStatuses = ['RX_PENDING', 'CONFIRMED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']
    const stuck = recentOrders
      .filter((o) => activeStatuses.includes(String(o.status)) && new Date(o.createdAt).getTime() < Date.now() - 30 * 60000)
      .map((o) => ({
        id: `stuck-${o.id}`,
        type: 'stuck',
        orderId: o.id,
        createdAt: o.createdAt,
        message: `STUCK in ${o.status} > 30 min`,
      }))

    const all = [...events, ...stuck]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30)

    return NextResponse.json({ events: all })
  } catch (err) {
    console.error('Pulse error:', err)
    return NextResponse.json({ error: 'Could not load pulse' }, { status: 500 })
  }
}