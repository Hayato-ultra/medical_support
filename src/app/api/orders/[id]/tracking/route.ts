import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'

function maskPhone(phone: string) {
  if (!phone || phone.length < 4) return '••••••••••'
  return `••••••${phone.slice(-4)}`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to track your order')

  try {
    const supabase = createReadOnlyApiClient()
    const { id } = await params
    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const { data: events } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('order_id', order.id)
    const { data: itemRows } = await supabase
      .from('order_items')
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
    const { data: rider } = order.rider_id
      ? await supabase
          .from('riders')
          .select('*')
          .eq('id', order.rider_id)
          .single()
      : { data: null }

    const items = await Promise.all(
      (itemRows || []).map(async (row) => {
        const { data: medicine } = await supabase
          .from('medicines')
          .select('name, requires_prescription')
          .eq('id', row.medicine_id)
          .single()
        return {
          medicineId: row.medicine_id,
          name: medicine?.name ?? 'Medicine',
          quantity: row.quantity,
          price: String(row.price),
          requiresPrescription: !!medicine?.requires_prescription,
        }
      })
    )

    const outForDelivery = order.status === 'OUT_FOR_DELIVERY'
    const isCustomer = actor.role === 'CUSTOMER'

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalAmount: String(order.total_amount),
        deliveryFee: String(order.delivery_fee),
        deliveryAddress: order.delivery_address,
        notes: order.notes || '',
        createdAt: order.created_at,
        prescriptionId: order.prescription_id || null,
        pharmacyName: pharmacy?.name ?? null,
        items,
      },
      timeline: (events || [])
        .map((event) => ({
          id: event.id,
          status: event.status,
          notes: event.notes,
          timestamp: event.timestamp,
        }))
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      rider: rider
        ? {
            id: rider.id,
            name: rider.name,
            vehicleType: rider.vehicle_type,
            licensePlate: rider.license_plate,
            maskedPhone: maskPhone(rider.phone),
            currentLat: rider.current_lat,
            currentLng: rider.current_lng,
          }
        : null,
      delivery: {
        otpRequired: outForDelivery && !order.otp_verified_at,
        otp: outForDelivery && isCustomer ? order.delivery_otp : null,
        verifiedAt: order.otp_verified_at || null,
      },
      payment: payment
        ? {
            status: payment.status,
            amount: String(payment.amount),
            method: payment.payment_method || null,
          }
        : null,
    })
  } catch (err) {
    console.error('Tracking fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load tracking for this order' },
      { status: 500 }
    )
  }
}