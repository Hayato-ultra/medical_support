import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, loadAuthorizedOrder } from '@/lib/api/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to reorder')

  try {
    const supabase = createReadOnlyApiClient()
    const { id } = await params
    const { order, error } = await loadAuthorizedOrder(actor, id)
    if (error) return error
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const { data: rows } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    const items = await Promise.all(
      (rows || []).map(async (row) => {
        const { data: medicine } = await supabase
          .from('medicines')
          .select('name, requires_prescription')
          .eq('id', row.medicine_id)
          .single()
        return {
          medicineId: row.medicine_id,
          name: medicine?.name ?? 'Medicine',
          price: Number(row.price),
          quantity: row.quantity,
          requiresPrescription: !!medicine?.requires_prescription,
          available: !!medicine,
        }
      })
    )

    const unavailable = items.filter((i) => !i.available)

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      items,
      unavailable,
      prescriptionId: order.prescription_id || null,
    })
  } catch (err) {
    console.error('Reorder fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load this order for reorder' },
      { status: 500 }
    )
  }
}