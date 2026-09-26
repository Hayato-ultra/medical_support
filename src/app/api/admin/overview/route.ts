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

    // Customers
    const [customersNow, customersPrior] = await Promise.all([
      db.orm.Customer.where({ createdAt: { gte: since.toISOString() } }).all(),
      db.orm.Customer.where({ createdAt: { gte: priorSince.toISOString(), lt: since.toISOString() } }).all(),
    ])
    const customersDelta = customersPrior.length
      ? ((customersNow.length - customersPrior.length) / customersPrior.length) * 100
      : 0

    // Orders in range
    const ordersNow: any[] = await db.orm.Order.where({ createdAt: { gte: since.toISOString() } }).all()
    const ordersPrior: any[] = await db.orm.Order.where({ createdAt: { gte: priorSince.toISOString(), lt: since.toISOString() } }).all()

    const completedNow = ordersNow.filter((o) => o.status === 'DELIVERED')
    const completedPrior = ordersPrior.filter((o) => o.status === 'DELIVERED')
    const completedDelta = completedPrior.length
      ? ((completedNow.length - completedPrior.length) / completedPrior.length) * 100
      : 0

    const avgOrderValue = completedNow.length
      ? completedNow.reduce((sum, o) => sum + Number(o.totalAmount), 0) / completedNow.length
      : 0

    // Active orders (right now)
    const allOrders: any[] = await db.orm.Order.where({}).all()
    const activeOrders = allOrders.filter((o) =>
      ['RX_PENDING', 'CONFIRMED', 'ACCEPTED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(String(o.status))
    )
    const stuckOrders = activeOrders.filter((o) => new Date(o.createdAt).getTime() < Date.now() - 30 * 60000).length

    // Revenue today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const paymentsToday: any[] = await db.orm.Payment.where({
      createdAt: { gte: todayStart.toISOString() },
      status: 'COMPLETED',
    }).all()
    const revenueToday = paymentsToday.reduce((sum, p) => sum + Number(p.amount), 0)

    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const paymentsYesterday: any[] = await db.orm.Payment.where({
      createdAt: { gte: yesterdayStart.toISOString(), lt: todayStart.toISOString() },
      status: 'COMPLETED',
    }).all()
    const revenueYesterday = paymentsYesterday.reduce((sum, p) => sum + Number(p.amount), 0)
    const revenueDelta = revenueYesterday
      ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
      : 0

    // Rates
    const allOrdersWeek: any[] = await db.orm.Order.where({ createdAt: { gte: new Date(Date.now() - 604800000).toISOString() } }).all()
    const deliveredWeek = allOrdersWeek.filter((o) => o.status === 'DELIVERED').length
    const cancelledWeek = allOrdersWeek.filter((o) => o.status === 'CANCELLED').length
    const totalWeek = deliveredWeek + cancelledWeek
    const deliveryRate = totalWeek ? (deliveredWeek / totalWeek) * 100 : 0
    const cancelRate = totalWeek ? (cancelledWeek / totalWeek) * 100 : 0

    // Rx approval rate
    const rxWeek: any[] = await db.orm.Prescription.where({ createdAt: { gte: new Date(Date.now() - 604800000).toISOString() } }).all()
    const rxVerified = rxWeek.filter((r) => r.status === 'VERIFIED').length
    const rxRejected = rxWeek.filter((r) => r.status === 'REJECTED').length
    const rxTotal = rxVerified + rxRejected
    const rxApprovalRate = rxTotal ? (rxVerified / rxTotal) * 100 : 0

    let avgVerifyMin = 0
    if (rxTotal > 0) {
      const totalMs = rxWeek.reduce((sum, r) => {
        if (r.verifiedAt && r.createdAt) return sum + (new Date(r.verifiedAt).getTime() - new Date(r.createdAt).getTime())
        return sum
      }, 0)
      avgVerifyMin = Math.round(totalMs / rxTotal / 60000)
    }

    // OOS rate
    const oosLines: any[] = await db.orm.OrderItem.where({ fulfillmentStatus: 'OUT_OF_STOCK' }).all()
    const allLines: any[] = await db.orm.OrderItem.where({}).all()
    const oosRate = allLines.length ? (oosLines.length / allLines.length) * 100 : 0

    return NextResponse.json({
      customers: customersNow.length,
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