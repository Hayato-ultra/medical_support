import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
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
    const supabase = createReadOnlyApiClient()
    const body = await req.json()
    const data = OrderCreateSchema.parse(body)

    // Check service area
    const { data: area } = await supabase
      .from('service_areas')
      .select('*')
      .eq('pincode', data.deliveryAddress.pincode)
      .eq('is_active', true)
      .single()
    if (!area) {
      return NextResponse.json(
        {
          error: 'OUTSIDE_SERVICE_AREA',
          message: `We do not deliver to ${data.deliveryAddress.pincode} yet.`,
        },
        { status: 409 }
      )
    }

    // Resolve medicines
    const medicines: any[] = []
    for (const item of data.items) {
      const { data: medicine, error } = await supabase
        .from('medicines')
        .select('*')
        .eq('id', item.medicineId)
        .single()
      if (error || !medicine) {
        return NextResponse.json(
          { error: 'Medicine not found', medicineId: item.medicineId },
          { status: 404 }
        )
      }
      medicines.push(medicine)
    }
    const needsRx = medicines.some((m) => !!m.requires_prescription)

    // Get active pharmacies
    const { data: activePharmacies } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)

    if (!activePharmacies || activePharmacies.length === 0) {
      return NextResponse.json(
        { error: 'NO_ELIGIBLE_PHARMACY', message: 'No pharmacy is currently accepting orders.' },
        { status: 503 }
      )
    }

    // Check stock for each pharmacy
    const stockByPharmacy = new Map<string, any[]>()
    for (const p of activePharmacies) {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('pharmacy_id', p.id)
      stockByPharmacy.set(p.id, inventory || [])
    }

    const stockFor = (p: any, item: { medicineId: string }) =>
      (stockByPharmacy.get(p.id) ?? []).find(
        (r: any) => r.medicine_id === item.medicineId
      )

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

    const now = Date.now()
    const licenceValid = (p: any) =>
      !p.license_expiry || new Date(p.license_expiry).getTime() > now
    const eligible = (p: any) =>
      !!p.is_active && licenceValid(p) && (!needsRx || !p.rx_paused)

    const ranked = activePharmacies
      .filter(eligible)
      .sort((a, b) => {
        const cover = Number(canCover(b)) - Number(canCover(a))
        if (cover !== 0) return cover
        const slack = spare(b) - spare(a)
        return slack !== 0 ? slack : String(a.name).localeCompare(String(b.name))
      })

    let pharmacy: any =
      (data.pharmacyId && ranked.find((p) => p.id === data.pharmacyId)) ||
      ranked[0] ||
      null
    if (!pharmacy) {
      const pausedOnly = activePharmacies.length > 0
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
        requiresPrescription: !!medicine.requires_prescription,
        name: medicine.name,
      })
    }

    if (needsRx && !data.prescriptionId) {
      return NextResponse.json(
        {
          error: 'PRESCRIPTION_REQUIRED',
          message: 'Some medicines in your cart need a prescription. Upload one to continue.',
        },
        { status: 400 }
      )
    }

    if (data.prescriptionId) {
      const { data: prescription } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', data.prescriptionId)
        .single()
      if (!prescription) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 400 })
      }
      if (prescription.customer_id !== actor.customerId) {
        return forbidden('That prescription belongs to another account')
      }
      if (prescription.status !== 'PENDING' && prescription.status !== 'VERIFIED') {
        return NextResponse.json(
          {
            error: 'PRESCRIPTION_NOT_USABLE',
            message: `This prescription was ${String(prescription.status).toLowerCase()}. Upload a new one to continue.`,
          },
          { status: 409 }
        )
      }
      const { data: inFlightOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('prescription_id', data.prescriptionId)
      const inFlight = inFlightOrders?.find((o) =>
        !['DELIVERED', 'CANCELLED', 'RX_REJECTED'].includes(String(o.status))
      )
      if (inFlight) {
        return NextResponse.json(
          {
            error: 'PRESCRIPTION_IN_USE',
            message: `This prescription is already attached to order ${inFlight.order_number}.`,
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

    const initialStatus = 'PENDING_PAYMENT'
    const initialNote = 'Order created. Complete payment to confirm.'

    // Final FK validation
    const { data: customerExists } = await supabase
      .from('customers')
      .select('id')
      .eq('id', actor.customerId)
      .single()
    if (!customerExists) {
      return NextResponse.json({ error: 'Customer record not found. Please sign in again.' }, { status: 401 })
    }
    const { data: pharmacyExists } = await supabase
      .from('pharmacies')
      .select('id')
      .eq('id', pharmacy.id)
      .single()
    if (!pharmacyExists) {
      return NextResponse.json({ error: 'Pharmacy no longer available' }, { status: 409 })
    }
    if (data.prescriptionId) {
      const { data: rxExists } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('id', data.prescriptionId)
        .eq('customer_id', actor.customerId)
        .single()
      if (!rxExists) {
        return NextResponse.json({ error: 'Prescription not found or access denied' }, { status: 400 })
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        id: randomUUID(),
        order_number: orderNumber,
        customer_id: actor.customerId,
        pharmacy_id: pharmacy.id,
        prescription_id: data.prescriptionId || null,
        status: initialStatus,
        total_amount: String(totalAmount),
        delivery_fee: String(deliveryFee),
        payment_intent_id: null,
        delivery_address: data.deliveryAddress,
        notes: data.notes || null,
        delivery_otp: null,
        otp_verified_at: null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    for (const line of lines) {
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          id: randomUUID(),
          order_id: order.id,
          medicine_id: line.medicineId,
          quantity: line.quantity,
          price: String(line.price),
        })
      if (itemError) throw itemError
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: randomUUID(),
        order_id: order.id,
        amount: String(totalAmount),
        currency: 'INR',
        status: 'PENDING',
        payment_method: null,
        transaction_id: null,
      })
    if (paymentError) throw paymentError

    // Create tracking event
    const { error: trackingError } = await supabase
      .from('tracking_events')
      .insert({
        id: randomUUID(),
        order_id: order.id,
        status: initialStatus,
        timestamp: new Date().toISOString(),
        notes: initialNote,
      })
    if (trackingError) throw trackingError

    // Update inventory
    for (const line of lines) {
      const stock: any = inventoryRows.find(
        (r) => r.medicine_id === line.medicineId
      )
      if (stock) {
        const { error: invError } = await supabase
          .from('inventory')
          .update({ quantity: stock.quantity - line.quantity })
          .eq('id', stock.id)
        if (invError) throw invError
      }
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          totalAmount: String(totalAmount),
          deliveryFee: String(deliveryFee),
          pharmacyId: pharmacy.id,
          pharmacyName: pharmacy.name,
        },
        orderNumber: order.order_number,
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
    const supabase = createReadOnlyApiClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || undefined

    let query = supabase.from('orders').select('*')

    if (actor.role === 'CUSTOMER') {
      query = query.eq('customer_id', actor.customerId)
    } else if (actor.role === 'RIDER') {
      if (!actor.riderId) {
        return NextResponse.json({ orders: [], count: 0 })
      }
      query = query.eq('rider_id', actor.riderId)
    } else if (hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
      const pharmacyId = await resolvePharmacyScope(actor)
      if (!pharmacyId) {
        return NextResponse.json({ orders: [], count: 0 })
      }
      query = query.eq('pharmacy_id', pharmacyId)
    }

    if (status) query = query.eq('status', status)

    const { data: orders, error } = await query
    if (error) throw error

    const withExtras = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: events } = await supabase
          .from('tracking_events')
          .select('*')
          .eq('order_id', order.id)
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', order.id)
          .single()
        const { data: pharmacy } = await supabase
          .from('pharmacies')
          .select('name')
          .eq('id', order.pharmacy_id)
          .single()
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        return {
          ...order,
          pharmacyName: pharmacy?.name ?? null,
          totalAmount: String(order.total_amount),
          deliveryFee: String(order.delivery_fee),
          paymentStatus: payment?.status ?? null,
          items: (items || []).map((i) => ({
            medicineId: i.medicine_id,
            quantity: i.quantity,
            price: String(i.price),
          })),
          timeline: (events || [])
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
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
