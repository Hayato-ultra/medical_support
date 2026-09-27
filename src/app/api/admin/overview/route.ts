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

    // Customers - properly extract count
    const [{ count: customersNow }, { count: customersPrior }] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', since.toISOString()),
      supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', priorSince.toISOString()).lt('created_at', since.toISOString()),
    ])
    const customersDelta = (customersPrior || 0)
      ? ((customersNow || 0) - (customersPrior || 0)) / (customersPrior || 1) * 100
      : 0

    // Orders in range
    const [{ data: ordersNow }, { data: ordersPrior }] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', since.toISOString()),
      supabase.from('orders').select('*').gte('created_at', priorSince.toISOString()).lt('created_at', since.toISOString()),
    ])

    const completedNow = (ordersNow || []).filter((o) => o.status === 'DELIVERED')
    const completedPrior = (ordersPrior || []).filter((o) => o.status === 'DELIVERED')
    const completedDelta = completedPrior.length
      ? ((completedNow.length - completedPrior.length) / completedPrior.length) * 100
      : 0

    const avgOrderValue = completedNow.length
      ? completedNow.reduce((sum, o) => sum + Number(o.total_amount), 0) / completedNow.length
      : 0

    // Active orders (right now)
    const { data: allOrders } = await supabase.from('orders').select('*')
    const activeOrders = (allOrders || []).filter((o) =>
      ['RX_PENDING', 'CONFIRMED', 'ACCEPTED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(String(o.status))
    )
    const stuckOrders = activeOrders.filter((o) => new Date(o.created_at).getTime() < Date.now() - 30 * 60000).length

    // Revenue today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: paymentsToday } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', todayStart.toISOString())
      .eq('status', 'COMPLETED')
    const revenueToday = (paymentsToday || []).reduce((sum, p) => sum + Number(p.amount), 0)

    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const { data: paymentsYesterday } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .eq('status', 'COMPLETED')
    const revenueYesterday = (paymentsYesterday || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const revenueDelta = revenueYesterday
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
      : 0

    // Rates
    const weekAgo = new Date(Date.now() - 604800000)
    const { data: allOrdersWeek } = await supabase
      .from('orders')
      .select('status')
      .gte('created_at', weekAgo.toISOString())
    const deliveredWeek = (allOrdersWeek || []).filter((o) => o.status === 'DELIVERED').length
    const cancelledWeek = (allOrdersWeek || []).filter((o) => o.status === 'CANCELLED').length
    const totalWeek = deliveredWeek + cancelledWeek
    const deliveryRate = totalWeek ? (deliveredWeek / totalWeek) * 100 : 0
    const cancelRate = totalWeek ? (cancelledWeek / totalWeek) * 100 : 0

    // Rx approval rate
    const { data: rxWeek } = await supabase
      .from('prescriptions')
      .select('status, verified_at, created_at')
      .gte('created_at', weekAgo.toISOString())
    const rxVerified = (rxWeek || []).filter((r) => r.status === 'VERIFIED').length
    const rxRejected = (rxWeek || []).filter((r) => r.status === 'REJECTED').length
    const rxTotal = rxVerified + rxRejected
    const rxApprovalRate = rxTotal ? (rxVerified / rxTotal) * 100 : 0

    let avgVerifyMin = 0
    if (rxTotal > 0) {
      const totalMs = (rxWeek || []).reduce((sum, r) => {
        if (r.verified_at && r.created_at) return sum + (new Date(r.verified_at).getTime() - new Date(r.created_at).getTime())
        return sum
      }, 0)
      avgVerifyMin = Math.round(totalMs / rxTotal / 60000)
    }

    // OOS rate - properly extract counts
    const [{ count: oosLines }, { count: allLines }] = await Promise.all([
      supabase.from('order_items').select('*', { count: 'exact', head: true }).eq('fulfillment_status', 'OUT_OF_STOCK'),
      supabase.from('order_items').select('*', { count: 'exact', head: true }),
    ])
    const oosRate = (allLines || 0) ? ((oosLines || 0) / (allLines || 1)) * 100 : 0

    return NextResponse.json({
      customers: customersNow || 0,
      customersDelta,
      completedOrders: completedNow.length,
      completedDelta,
      avgOrderValue,
      activeOrders: activeOrders.length,
      stuckOrders,
      revenueToday,
      revenueYesterday,
      revenueDelta,
      deliveryRate,
      cancelRate,
      rxApprovalRate,
      avgVerifyMin,
      oosRate,
    })
  } catch (err) {
    console.error('Admin overview error:', err)
    return NextResponse.json({ error: 'Could not load overview' }, { status: 500 })
  }
}
