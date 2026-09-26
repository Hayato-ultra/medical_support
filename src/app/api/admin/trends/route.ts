import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'

export async function GET(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!hasRole(actor, 'ADMIN')) return forbidden('Admin only')

  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'today'

    const rangeMs = range === 'today' ? 86400000 : range === '7d' ? 604800000 : 2592000000
    const since = new Date(Date.now() - rangeMs)
    const priorSince = new Date(since.getTime() - rangeMs)

    // Revenue trend
    const payments: any[] = await db.orm.Payment.where({
      createdAt: { gte: since.toISOString() },
      status: 'COMPLETED',
    }).all()

    const paymentsYesterday: any[] = range === 'today'
      ? await db.orm.Payment.where({
          createdAt: { gte: priorSince.toISOString(), lt: since.toISOString() },
          status: 'COMPLETED',
        }).all()
      : []

    let revenue
    if (range === 'today') {
      const hours = Array.from({ length: 24 }, (_, h) => {
        const start = new Date()
        start.setHours(h, 0, 0, 0)
        const end = new Date(start.getTime() + 3600000)
        const rev = payments
          .filter((p) => new Date(p.createdAt) >= start && new Date(p.createdAt) < end)
          .reduce((s, p) => s + Number(p.amount), 0)
        const revY = paymentsYesterday
          .filter((p) => new Date(p.createdAt) >= start && new Date(p.createdAt) < end)
          .reduce((s, p) => s + Number(p.amount), 0)
        return { hour: `${h.toString().padStart(2, '0')}:00`, revenue: rev, revenueYesterday: revY }
      })
      revenue = hours
    } else {
      const days = Math.ceil(rangeMs / 86400000)
      const daily = Array.from({ length: days }, (_, d) => {
        const start = new Date(since.getTime() + d * 86400000)
        const end = new Date(start.getTime() + 86400000)
        const rev = payments
          .filter((p) => new Date(p.createdAt) >= start && new Date(p.createdAt) < end)
          .reduce((s, p) => s + Number(p.amount), 0)
        return { date: start.toISOString().split('T')[0], revenue: rev }
      })
      revenue = daily
    }

    // Demand by hour (7-day average regardless of range selector)
    const weekAgo = new Date(Date.now() - 604800000)
    const ordersWeek: any[] = await db.orm.Order.where({ createdAt: { gte: weekAgo.toISOString() } }).all()
    const demandByHour = Array.from({ length: 24 }, (_, h) => {
      const count = ordersWeek.filter((o) => new Date(o.createdAt).getHours() === h).length
      return { hour: `${h.toString().padStart(2, '0')}:00`, orders: count }
    })

    // Avg delivery time (daily, last 14 days)
    const twoWeeksAgo = new Date(Date.now() - 1209600000)
    const deliveredOrders: any[] = await db.orm.Order.where({
      status: 'DELIVERED',
      createdAt: { gte: twoWeeksAgo.toISOString() },
    }).all()

    const trackingEvents: any[] = await db.orm.TrackingEvent.where({
      status: 'DELIVERED',
      timestamp: { gte: twoWeeksAgo.toISOString() },
    }).all()

    const deliveryByDate = new Map<string, { sum: number; count: number }>()
    for (const order of deliveredOrders) {
      const deliveredEvent = trackingEvents.find((e) => e.orderId === order.id)
      if (deliveredEvent) {
        const diffMin = (new Date(deliveredEvent.timestamp).getTime() - new Date(order.createdAt).getTime()) / 60000
        const day = new Date(order.createdAt).toISOString().split('T')[0]
        const bucket = deliveryByDate.get(day) || { sum: 0, count: 0 }
        bucket.sum += diffMin
        bucket.count++
        deliveryByDate.set(day, bucket)
      }
    }

    const deliveryTime = Array.from(deliveryByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, avgMinutes: v.count ? v.sum / v.count : 0 }))

    return NextResponse.json({ revenue, demandByHour, deliveryTime })
  } catch (err) {
    console.error('Admin trends error:', err)
    return NextResponse.json({ error: 'Could not load trends' }, { status: 500 })
  }
}