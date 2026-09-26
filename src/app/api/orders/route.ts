import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, forbidden, resolvePharmacyScope, hasRole } from '@/lib/api/auth'

const OrderCreateSchema = z.object({
  pharmacyId: z.string().min(1).optional(),
  items: z
    .array(
      z.object({
        medicineId: z.string().min(1),
        quantity: z.number().int().min(1).max(10),
      })
    )
    .min(1),
  deliveryAddress: z.object({
    label: z.string().min(1),
    address: z.string().min(5),
    landmark: z.string().optional(),
    pincode: z.string().length(6),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  prescriptionId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

const FREE_DELIVERY_ABOVE = 500
const DELIVERY_FEE = 40

export async function POST(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to place an order')
  if (actor.role !== 'CUSTOMER') {
    return forbidden('Only customer accounts can place orders')
  }

  try {
    const body = await req.json()
    const data = OrderCreateSchema.parse(body)

    // The checkout screen checks this too, but the client is not a boundary:
    // an order outside our delivery areas must never reach the database.
    const area: any = await db.orm.ServiceArea
      .where({ pincode: data.deliveryAddress.pincode, isActive: 1 })
      .first()
    if (!area) {
      return NextResponse.json(
        {
          error: 'OUTSIDE_SERVICE_AREA',
          message: `We do not deliver to ${data.deliveryAddress.pincode} yet.`,
        },
        { status: 409 }
      )
    }

    // Resolve the medicines before choosing a pharmacy, because whether the
    // order needs a prescription decides which pharmacies are eligible at all.
    const medicines: any[] = []
    for (const item of data.items) {
      const medicine: any = await db.orm.Medicine
        .where({ id: item.medicineId })
        .first()
      if (!medicine) {
        return NextResponse.json(
          { error: 'Medicine not found', medicineId: item.medicineId },
          { status: 404 }
        )
      }
      medicines.push(medicine)
    }
    const needsRx = medicines.some((m) => !!m.requiresPrescription)

    // A pharmacy with an expired or missing licence may not take any order, and
    // one paused for prescriptions may still sell over the counter but not
    // dispense against a prescription.
    const now = Date.now()
    const licenceValid = (p: any) =>
      !p.licenseExpiry || new Date(p.licenseExpiry).getTime() > now
    const eligible = (p: any) =>
      !!p.isActive && licenceValid(p) && (!needsRx || !p.rxPaused)

    const active: any[] = await db.orm.Pharmacy.where({ isActive: 1 }).all()
    const stockByPharmacy = new Map<string, any[]>()
    for (const p of active) {
      stockByPharmacy.set(
        p.id,
        await db.orm.Inventory.where({ pharmacyId: p.id }).all()
      )
    }

    const stockFor = (p: any, item: { medicineId: string }) =>
      (stockByPharmacy.get(p.id) ?? []).find(
        (r: any) => r.medicineId === item.medicineId
      )

    // Prefer a pharmacy that can fill the whole basket, then the one with the
    // most spare stock, then name order so the choice is stable. Previously this
    // took the first active row, so one out-of-stock store rejected every order.
    const canCover = (p: any) =>
      data.items.every((item) => {
        const row = stockFor(p, item)
        return !!row && row.quantity >= item.quantity
      })
    const spare = (p: any) =>
      data.items.reduce(
        (sum, item) => sum + ((stockFor(p, item)?.quantity ?? 0) - item.quantity),
        0
      )

    const ranked = active
      .filter(eligible)
      .sort((a, b) => {
        const cover = Number(canCover(b)) - Number(canCover(a))
        if (cover !== 0) return cover
        const slack = spare(b) - spare(a)
        return slack !== 0 ? slack : String(a.name).localeCompare(String(b.name))
      })

    // A client-supplied pharmacy is a preference, not authority: it is honoured
    // only when it survives the same eligibility and stock checks.
    let pharmacy: any =
      (data.pharmacyId && ranked.find((p) => p.id === data.pharmacyId)) ||
      ranked[0] ||
      null
    if (!pharmacy) {
      const pausedOnly = active.length > 0
      return NextResponse.json(
        {
          error: 'NO_ELIGIBLE_PHARMACY',
          message: pausedOnly
            ? needsRx
              ? 'Every pharmacy nearby is licensed but has no pharmacist on duty for prescriptions right now.'
              : 'No pharmacy near you has a valid licence to dispense.'
            : 'No pharmacy is currently accepting orders.',
        },
        { status: 503 }
      )
    }

    const inventoryRows: any[] = stockByPharmacy.get(pharmacy.id) ?? []

    const lines: Array<{
      medicineId: string
      quantity: number
      price: number
      requiresPrescription: boolean
      name: string
    }> = []

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      const stock: any = stockFor(pharmacy, item)
      if (!stock) {
        return NextResponse.json(
          {
            error: 'OUT_OF_STOCK',
            message: 'One of the items is no longer stocked at this pharmacy.',
            medicineId: item.medicineId,
          },
          { status: 409 }
        )
      }
      if (stock.quantity < item.quantity) {
        return NextResponse.json(
          {
            error: 'INSUFFICIENT_STOCK',
            message: `Only ${stock.quantity} unit(s) left of that medicine.`,
            medicineId: item.medicineId,
            available: stock.quantity,
          },
          { status: 409 }
        )
      }

      const medicine = medicines[i]
      lines.push({
        medicineId: medicine.id,
        quantity: item.quantity,
        price: Number(stock.price),
        requiresPrescription: !!medicine.requiresPrescription,
        name: medicine.name,
      })
    }

    if (needsRx && !data.prescriptionId) {      return NextResponse.json(
        {
          error: 'PRESCRIPTION_REQUIRED',
          message:
            'Some medicines in your cart need a prescription. Upload one to continue.',
        },
        { status: 400 }
      )
    }

    if (data.prescriptionId) {
      const prescription: any = await db.orm.Prescription
        .where({ id: data.prescriptionId })
        .first()
      if (!prescription) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 400 })
      }
      if (prescription.customerId !== actor.customerId) {
        return forbidden('That prescription belongs to another account')
      }
      // A rejected or already-used prescription must not be attachable to a new
      // order, otherwise the pharmacist queue is fed work that can never clear.
      if (prescription.status !== 'PENDING' && prescription.status !== 'VERIFIED') {
        return NextResponse.json(
          {
            error: 'PRESCRIPTION_NOT_USABLE',
            message: `This prescription was ${String(prescription.status).toLowerCase()}. Upload a new one to continue.`,
          },
          { status: 409 }
        )
      }
      const alreadyUsed: any[] = await db.orm.Order
        .where({ prescriptionId: data.prescriptionId })
        .all()
      const inFlight = alreadyUsed.find((o) =>
        !['DELIVERED', 'CANCELLED', 'RX_REJECTED'].includes(String(o.status))
      )
      if (inFlight) {
        return NextResponse.json(
          {
            error: 'PRESCRIPTION_IN_USE',
            message: `This prescription is already attached to order ${inFlight.orderNumber}.`,
          },
          { status: 409 }
        )
      }
    }

    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    const deliveryFee =
      subtotal >= FREE_DELIVERY_ABOVE || subtotal === 0 ? 0 : DELIVERY_FEE
    const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100

    const orderNumber = `MS${Date.now().toString().slice(-8)}${randomUUID()
      .slice(0, 3)
      .toUpperCase()}`

    // Every order starts unpaid. The payment webhook is what promotes it to
    // RX_PENDING (prescription queue) or CONFIRMED, so the pharmacy never sees
    // work that nobody has paid for.
    const initialStatus = 'PENDING_PAYMENT'
    const initialNote = 'Order created. Complete payment to confirm.'

    const order: any = await db.orm.Order.create({
      id: randomUUID(),
      orderNumber,
      customerId: actor.customerId,
      pharmacyId: pharmacy.id,
      prescriptionId: data.prescriptionId || null,
      status: initialStatus,
      totalAmount: String(totalAmount),
      deliveryFee: String(deliveryFee),
      paymentIntentId: null,
      deliveryAddress: data.deliveryAddress,
      notes: data.notes || null,
      deliveryOtp: null,
      otpVerifiedAt: null,
    } as any)

    // The ORM has no nested relation writes, so the lines go in one by one.
    for (const line of lines) {
      await db.orm.OrderItem.create({
        id: randomUUID(),
        orderId: order.id,
        medicineId: line.medicineId,
        quantity: line.quantity,
        price: String(line.price),
      } as any)
    }

    await db.orm.Payment.create({
      id: randomUUID(),
      orderId: order.id,
      amount: String(totalAmount),
      currency: 'INR',
      status: 'PENDING',
      paymentMethod: null,
      transactionId: null,
    } as any)

    await db.orm.TrackingEvent.create({
      id: randomUUID(),
      orderId: order.id,
      status: initialStatus,
      timestamp: new Date(),
      notes: initialNote,
    } as any)

    for (const line of lines) {
      const stock: any = inventoryRows.find(
        (r) => r.medicineId === line.medicineId
      )
      await db.orm.Inventory
        .where({ id: stock.id })
        .update({ quantity: stock.quantity - line.quantity })
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalAmount: String(totalAmount),
          deliveryFee: String(deliveryFee),
          pharmacyId: pharmacy.id,
          pharmacyName: pharmacy.name,
        },
        orderNumber: order.orderNumber,
        subtotal,
        deliveryFee,
        total: totalAmount,
        nextStep: 'PAY',
        message: initialNote,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid order data', details: error.flatten() },
        { status: 400 }
      )
    }
    console.error('Order creation error:', error)
    return NextResponse.json(
      { error: 'Could not place your order. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to view orders')

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    const where: any = {}

    if (actor.role === 'CUSTOMER') {
      where.customerId = actor.customerId
    } else if (actor.role === 'RIDER') {
      if (!actor.riderId) {
        return NextResponse.json({ orders: [], count: 0 })
      }
      where.riderId = actor.riderId
    } else if (hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
      const pharmacyId = await resolvePharmacyScope(actor)
      if (!pharmacyId) {
        return NextResponse.json({ orders: [], count: 0 })
      }
      where.pharmacyId = pharmacyId
    }

    if (status) where.status = status

    const orders: any[] = await db.orm.Order.where(where).all()

    const withExtras = await Promise.all(
      orders.map(async (order) => {
        const events: any[] = await db.orm.TrackingEvent
          .where({ orderId: order.id })
          .all()
        const payment: any = await db.orm.Payment
          .where({ orderId: order.id })
          .first()
        const pharmacy: any = await db.orm.Pharmacy
          .where({ id: order.pharmacyId })
          .first()
        const items: any[] = await db.orm.OrderItem
          .where({ orderId: order.id })
          .all()

        return {
          ...order,
          pharmacyName: pharmacy?.name ?? null,
          totalAmount: String(order.totalAmount),
          deliveryFee: String(order.deliveryFee),
          paymentStatus: payment?.status ?? null,
          items: items.map((i) => ({
            medicineId: i.medicineId,
            quantity: i.quantity,
            price: String(i.price),
          })),
          timeline: events
            .map((e) => ({
              status: e.status,
              notes: e.notes,
              timestamp: e.timestamp,
            }))
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            ),
        }
      })
    )

    withExtras.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ orders: withExtras, count: withExtras.length })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Could not load your orders' },
      { status: 500 }
    )
  }
}
