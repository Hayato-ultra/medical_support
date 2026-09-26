import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to track your order')

  try {
    const { id } = await params
    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const events: any[] = await db.orm.TrackingEvent
      .where({ orderId: order.id })
      .all()
    const itemRows: any[] = await db.orm.OrderItem
      .where({ orderId: order.id })
      .all()
    const payment: any = await db.orm.Payment
      .where({ orderId: order.id })
      .first()
    const pharmacy: any = await db.orm.Pharmacy
      .where({ id: order.pharmacyId })
      .first()
    const rider = order.riderId
      ? await db.orm.Rider.where({ id: order.riderId }).first()
      : null

    const items = await Promise.all(
      itemRows.map(async (row) => {
        const medicine: any = await db.orm.Medicine
          .where({ id: row.medicineId })
          .first()
        return {
          medicineId: row.medicineId,
          name: medicine?.name ?? 'Medicine',
          quantity: row.quantity,
          price: String(row.price),
          requiresPrescription: !!medicine?.requiresPrescription,
        }
      })
    )

    const outForDelivery = order.status === 'OUT_FOR_DELIVERY'
    // The delivery code is the customer's to read out, so staff and the rider
    // get told that a code is required but never see the digits.
    const isCustomer = actor.role === 'CUSTOMER'

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: String(order.totalAmount),
        deliveryFee: String(order.deliveryFee),
        deliveryAddress: order.deliveryAddress,
        notes: order.notes || '',
        createdAt: order.createdAt,
        prescriptionId: order.prescriptionId || null,
        pharmacyName: pharmacy?.name ?? null,
        items,
      },
      timeline: events
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
            vehicleType: rider.vehicleType,
            licensePlate: rider.licensePlate,
            maskedPhone: maskPhone(rider.phone),
            currentLat: rider.currentLat,
            currentLng: rider.currentLng,
          }
        : null,
      // The delivery OTP is only ever shown to the customer, and only while
      // the order is out for delivery, so the rider must read it out.
      delivery: {
        otpRequired: outForDelivery && !order.otpVerifiedAt,
        otp: outForDelivery && isCustomer ? order.deliveryOtp : null,
        verifiedAt: order.otpVerifiedAt || null,
      },
      payment: payment
        ? {
            status: payment.status,
            amount: String(payment.amount),
            method: payment.paymentMethod || null,
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

function maskPhone(phone: string) {
  if (!phone || phone.length < 4) return '••••••••••'
  return `••••••${phone.slice(-4)}`
}
