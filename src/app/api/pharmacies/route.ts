import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

/** Public list of pharmacies currently accepting orders. */
export async function GET() {
  try {
    const pharmacies: any[] = await db.orm.Pharmacy.where({ isActive: 1 }).all()

    const withCounts = await Promise.all(
      pharmacies.map(async (pharmacy) => {
        const inventory: any[] = await db.orm.Inventory
          .where({ pharmacyId: pharmacy.id })
          .all()
        const inStock = inventory.filter((i) => i.quantity > 0).length
        return {
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          pincode: pharmacy.pincode,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          operatingHours: pharmacy.operatingHours ?? null,
          medicinesInStock: inStock,
        }
      })
    )

    return NextResponse.json({ pharmacies: withCounts, count: withCounts.length })
  } catch (err) {
    console.error('Pharmacy fetch error:', err)
    return NextResponse.json(
      { error: 'Could not load pharmacies' },
      { status: 500 }
    )
  }
}
