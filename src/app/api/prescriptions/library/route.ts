import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import { getActor, unauthorized, forbidden } from '@/lib/api/auth'

export async function GET(_req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to view your prescriptions')
  if (actor.role !== 'CUSTOMER') {
    return forbidden('Only customer accounts have a prescription library')
  }

  try {
    const supabase = createReadOnlyApiClient()
    const { data: entries, error } = await supabase
      .from('prescription_library')
      .select('*')
      .eq('customer_id', actor.customerId)

    if (error) throw error

    const now = Date.now()
    const items = await Promise.all(
      (entries || []).map(async (entry) => {
        const { data: prescription } = await supabase
          .from('prescriptions')
          .select('status')
          .eq('id', entry.prescription_id)
          .single()
        return {
          id: entry.id,
          prescriptionId: entry.prescription_id,
          doctorName: entry.doctor_name || 'Not recorded',
          expiryDate: entry.expiry_date,
          createdAt: entry.created_at,
          verificationStatus: prescription?.status ?? 'PENDING',
          imageUrl: entry.image_url,
          expired: entry.expiry_date ? new Date(entry.expiry_date).getTime() < now : false,
        }
      })
    )

    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ prescriptions: items, count: items.length })
  } catch (err) {
    console.error('Prescription library fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load your saved prescriptions' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to manage your prescriptions')

  try {
    const supabase = createReadOnlyApiClient()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: entry, error } = await supabase
      .from('prescription_library')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !entry) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
    }
    if (entry.customer_id !== actor.customerId) {
      return forbidden('That prescription belongs to another account')
    }

    const { data: inUse } = await supabase
      .from('orders')
      .select('*')
      .eq('prescription_id', entry.prescription_id)
    const activeOrder = (inUse || []).find((o) =>
      !['DELIVERED', 'CANCELLED', 'RX_REJECTED'].includes(String(o.status))
    )
    if (activeOrder) {
      return NextResponse.json(
        {
          error: `This prescription is attached to order ${activeOrder.order_number}. Wait until it is delivered or cancel that order first.`,
        },
        { status: 409 }
      )
    }

    const { error: deleteError } = await supabase
      .from('prescription_library')
      .delete()
      .eq('id', id)
    if (deleteError) throw deleteError

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('Prescription library delete error:', err)
    return NextResponse.json(
      { error: 'Could not remove this prescription' },
      { status: 500 }
    )
  }
}
