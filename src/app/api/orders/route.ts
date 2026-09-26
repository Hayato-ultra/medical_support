import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const OrderCreateSchema = z.object({
  customerId: z.string(),
  pharmacyId: z.string(),
  items: z.array(z.object({
    medicineId: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().positive(),
  })),
  totalAmount: z.number().positive(),
  deliveryFee: z.number().min(0),
  deliveryAddress: z.object({
    label: z.string(),
    address: z.string(),
    pincode: z.string(),
  }),
  prescriptionId: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = OrderCreateSchema.parse(body)

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const prescriptionVerified = data.prescriptionId
      ? await db.orm.Prescription.where({ id: data.prescriptionId, status: 'VERIFIED' }).first()
      : null

    const order = await db.orm.Order.create({
      id: crypto.randomUUID(),
      orderNumber,
      customerId: data.customerId,
      pharmacyId: data.pharmacyId,
      prescriptionId: data.prescriptionId || '',
      status: prescriptionVerified ? 'CONFIRMED' : 'PENDING',
      totalAmount: String(data.totalAmount),
      deliveryFee: String(data.deliveryFee),
      deliveryAddress: JSON.stringify(data.deliveryAddress),
      notes: data.notes || '',
      paymentIntentId: '',
      items: [] as any,
    }) as any

    return NextResponse.json({ order, orderNumber }, { status: 201 })
  } catch (error) {
    console.error('Order creation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId') || undefined
    const status = searchParams.get('status') || undefined

    const where: any = {}
    if (customerId) where.customerId = customerId
    if (status) where.status = status

    const orders = await db.orm.Order.where(where).all()
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
