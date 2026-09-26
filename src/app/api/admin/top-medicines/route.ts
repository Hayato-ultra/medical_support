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

    const orders: any[] = await db.orm.Order.where({
      createdAt: { gte: since.toISOString() },
      status: { nin: ['CANCELLED'] },
    }).all()

    const orderIds = orders.map((o) => o.id)
    if (orderIds.length === 0) return NextResponse.json({ medicines: [] })

    const items: any[] = await db.orm.OrderItem.where({ orderId: { in: orderIds } }).all()

    const agg = new Map<string, { units: number; revenue: number; rxUnits: number; orders: Set<string> }>()
    for (const item of items) {
      const m: any = await db.orm.Medicine.where({ id: item.medicineId }).first()
      if (!m) continue
      const key = m.name
      const bucket = agg.get(key) || { units: 0, revenue: 0, rxUnits: 0, orders: new Set<string>() }
      bucket.units += item.quantity
      bucket.revenue += Number(item.price) * item.quantity
      if (m.requiresPrescription) bucket.rxUnits += item.quantity
      bucket.orders.add(item.orderId)
      agg.set(key, bucket)
    }

    const medicines = Array.from(agg.entries())
      .map(([name, v]) => ({
        name,
        units: v.units,
        revenue: v.revenue,
        rxPct: v.units ? Math.round((v.rxUnits / v.units) * 100) : 0,
        orderCount: v.orders.size,
      }))
      .sort((a, b) => b.units - a.units)

    return NextResponse.json({ medicines })
  } catch (err) {
    console.error('Top medicines error:', err)
    return NextResponse.json({ error: 'Could not load top medicines' }, { status: 500 })
  }
}