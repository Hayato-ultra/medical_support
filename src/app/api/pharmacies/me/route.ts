import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import {
  getActor,
  unauthorized,
  forbidden,
  hasRole,
  resolvePharmacyScope,
} from '@/lib/api/auth'

const UpdateSchema = z.object({
  rxPaused: z.boolean().optional(),
  licenseExpiry: z.string().datetime().nullable().optional(),
})

/** The signed-in pharmacy's own settings, including its licence and duty state. */
export async function GET() {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
    return forbidden('Only pharmacy accounts can view this')
  }

  const supabase = createReadOnlyApiClient()
  const pharmacyId = await resolvePharmacyScope(actor)
  if (!pharmacyId) return forbidden('No pharmacy is linked to this account')

  const { data: pharmacy, error } = await supabase
    .from('pharmacies')
    .select('*')
    .eq('id', pharmacyId)
    .single()
  if (error || !pharmacy) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })

  return NextResponse.json({
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      licenseNumber: pharmacy.license_number,
      licenseExpiry: pharmacy.license_expiry ?? null,
      rxPaused: !!pharmacy.rx_paused,
      isActive: !!pharmacy.is_active,
    },
  })
}

/**
 * Lets a pharmacy stand down for prescriptions without going fully inactive,
 * and records the date its retail licence lapses. Both are read by order
 * routing, so setting them here changes which orders arrive.
 */
export async function PATCH(req: Request) {
  const actor = await getActor()
  if (!actor) return unauthorized()
  if (!hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
    return forbidden('Only pharmacy accounts can change this')
  }

  const supabase = createReadOnlyApiClient()
  const pharmacyId = await resolvePharmacyScope(actor)
  if (!pharmacyId) return forbidden('No pharmacy is linked to this account')

  let data: z.infer<typeof UpdateSchema>
  try {
    data = UpdateSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (data.rxPaused !== undefined) patch.rx_paused = data.rxPaused
  if (data.licenseExpiry !== undefined) patch.license_expiry = data.licenseExpiry

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: pharmacy, error } = await supabase
    .from('pharmacies')
    .update(patch)
    .eq('id', pharmacyId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })

  return NextResponse.json({
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      licenseNumber: pharmacy.license_number,
      licenseExpiry: pharmacy.license_expiry ?? null,
      rxPaused: !!pharmacy.rx_paused,
      isActive: !!pharmacy.is_active,
    },
  })
}
