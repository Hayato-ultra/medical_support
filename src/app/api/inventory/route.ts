import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { z } from 'zod'

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
    const { searchParams } = new URL(req.url)
    const pharmacyId = searchParams.get('pharmacyId') || undefined
    const medicineId = searchParams.get('medicineId') || undefined

    const where: any = {}
    if (pharmacyId) where.pharmacyId = pharmacyId
    if (medicineId) where.medicineId = medicineId

    const inventory = await db.orm.Inventory.where(where).all()
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
    const body = await req.json()
    const data = InventoryUpdateSchema.parse(body)

    const existing = await db.orm.Inventory
      .where({ pharmacyId: data.pharmacyId, medicineId: data.medicineId })
      .first()

    if (existing) {
      const updateData = {
        id: existing.id,
        quantity: data.quantity,
        price: String(data.price),
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      }
      // @ts-ignore
      const updated = await db.orm.Inventory.update(updateData)
      return NextResponse.json({ inventory: updated })
    }

    const createData = {
      id: crypto.randomUUID(),
      medicineId: data.medicineId,
      pharmacyId: data.pharmacyId,
      quantity: data.quantity,
      price: String(data.price),
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    } as any
    // @ts-ignore
      const created = await db.orm.Inventory.create(createData)
    return NextResponse.json({ inventory: created }, { status: 201 })
  } catch (error) {
    console.error('Inventory update error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}
