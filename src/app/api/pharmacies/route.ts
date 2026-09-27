import { NextResponse } from 'next/server'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'

/** Public list of pharmacies currently accepting orders. */
export async function GET() {
  try {
    const supabase = createReadOnlyApiClient()

    const { data: pharmacies, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)

    if (error) throw error

    const withCounts = await Promise.all(
      (pharmacies || []).map(async (pharmacy) => {
        const { data: inventory } = await supabase
          .from('inventory')
          .select('quantity')
          .eq('pharmacy_id', pharmacy.id)
        const inStock = (inventory || []).filter((i) => i.quantity > 0).length
        return {
          id: pharmacy.id,
          name: pharmacy.name,
          address: pharmacy.address,
          pincode: pharmacy.pincode,
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          operatingHours: pharmacy.operating_hours ?? null,
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
