import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, forbidden, hasRole } from '@/lib/api/auth'

export async function GET(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!hasRole(actor, 'ADMIN')) return forbidden('Admin only')

  try {
    const supabase = createReadOnlyApiClient()
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'today'

    const rangeMs = range === 'today' ? 86400000 : range === '7d' ? 604800000 : 2592000000
    const since = new Date(Date.now() - rangeMs)
    const priorSince = new Date(since.getTime() - rangeMs)

    // Revenue trend
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .gte('created_at', since.toISOString())
      .eq('status', 'COMPLETED')

    const { data: paymentsYesterday } = range === 'today'
      ? await supabase
          .from('payments')
          .select('*')
          .gte('created_at', priorSince.toISOString())
          .lt('created_at', since.toISOString())
          .eq('status', 'COMPLETED')
      : { data: [] }

    let revenue
    if (range === 'today') {
      const hours = Array.from({ length: 24 }, (_, h) => {
        const start = new Date()
        start.setHours(h, 0, 0, 0)
        const end = new Date(start.getTime() + 3600000)
        const rev = (payments || [])
          .filter((p) => new Date(p.created_at) >= start && new Date(p.created_at) < end)
          .reduce((s, p) => s + Number(p.amount), 0)
        const revY = (paymentsYesterday || [])
          .filter((p) => new Date(p.created_at) >= start && new Date(p.created_at) < end)
          .reduce((s, p) => s + Number(p.amount), 0)
        return { hour: `${h.toString().padStart(2, '0')}:00`, revenue: rev, revenueYesterday: revY }
      })
      revenue = hours
    } else {
      const days = Math.ceil(rangeMs / 86400000)
      const daily = Array.from({ length: days }, (_, d) => {
        const start = new Date(since.getTime() + d * 86400000)
        const end = new Date(start.getTime() + 86400000)
        const rev = (payments || [])
          .filter((p) => new Date(p.created_at) >= start && new Date(p.created_at) < end)
          .reduce((s, p) => s + Number(p.amount), 0)
        return { date: start.toISOString().split('T')[0], revenue: rev }
      })
      revenue = daily
    }

    // Demand by hour (7-day average regardless of range selector)
    const weekAgo = new Date(Date.now() - 604800000)
    const { data: ordersWeek } = await supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', weekAgo.toISOString())
    const demandByHour = Array.from({ length: 24 }, (_, h) => {
      const count = (ordersWeek || []).filter((o) => new Date(o.created_at).getHours() === h).length
      return { hour: `${h.toString().padStart(2, '0')}:00`, orders: count }
    })

    // Avg delivery time (daily, last 14 days)
    const twoWeeksAgo = new Date(Date.now() - 1209600000)
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'DELIVERED')
      .gte('created_at', twoWeeksAgo.toISOString())

    const { data: trackingEvents } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('status', 'DELIVERED')
      .gte('timestamp', twoWeeksAgo.toISOString())

    const deliveryByDate = new Map<string, { sum: number; count: number }>()
    for (const order of deliveredOrders || []) {
      const deliveredEvent = (trackingEvents || []).find((e) => e.order_id === order.id)
      if (deliveredEvent) {
        const diffMin = (new Date(deliveredEvent.timestamp).getTime() - new Date(order.created_at).getTime()) / 60000
        const day = new Date(order.created_at).toISOString().split('T')[0]
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
