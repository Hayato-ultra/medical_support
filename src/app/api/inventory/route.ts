import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'

const InventoryUpdateSchema = z.object({
  medicineId: z.string(),
  pharmacyId: z.string(),
  quantity: z.number().int().min(0),
  price: z.number().positive(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const supabase = createReadOnlyApiClient()
    const { searchParams } = new URL(req.url)
    const pharmacyId = searchParams.get('pharmacyId') || undefined
    const medicineId = searchParams.get('medicineId') || undefined

    let query = supabase.from('inventory').select('*')
    if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId)
    if (medicineId) query = query.eq('medicine_id', medicineId)

    const { data: inventory, error } = await query
    if (error) throw error

    return NextResponse.json({ inventory })
  } catch (error) {
    console.error('Inventory fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = createReadOnlyApiClient()
    const body = await req.json()
    const data = InventoryUpdateSchema.parse(body)

    const { data: existing } = await supabase
      .from('inventory')
      .select('*')
      .eq('pharmacy_id', data.pharmacyId)
      .eq('medicine_id', data.medicineId)
      .single()

    const updateData = {
      quantity: data.quantity,
      price: String(data.price),
      batch_number: data.batchNumber,
      expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
    }

    if (existing) {
      const { data: updated, error } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ inventory: updated })
    }

    const { data: created, error } = await supabase
      .from('inventory')
      .insert({
        id: crypto.randomUUID(),
        ...updateData,
        medicine_id: data.medicineId,
        pharmacy_id: data.pharmacyId,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ inventory: created }, { status: 201 })
  } catch (error) {
    console.error('Inventory update error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}
