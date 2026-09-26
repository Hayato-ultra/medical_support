import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db/client'
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

  const pharmacyId = await resolvePharmacyScope(actor)
  if (!pharmacyId) return forbidden('No pharmacy is linked to this account')

  const pharmacy: any = await db.orm.Pharmacy.where({ id: pharmacyId }).first()
  if (!pharmacy) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })

  return NextResponse.json({
    pharmacy: {
      id: pharmacy.id,
      name: pharmacy.name,
      licenseNumber: pharmacy.licenseNumber,
      licenseExpiry: pharmacy.licenseExpiry ?? null,
      rxPaused: !!pharmacy.rxPaused,
      isActive: !!pharmacy.isActive,
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

  const pharmacyId = await resolvePharmacyScope(actor)
  if (!pharmacyId) return forbidden('No pharmacy is linked to this account')

  let data: z.infer<typeof UpdateSchema>
  try {
    data = UpdateSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid settings' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (data.rxPaused !== undefined) patch.rxPaused = data.rxPaused ? 1 : 0
  if (data.licenseExpiry !== undefined) patch.licenseExpiry = data.licenseExpiry

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const pharmacy: any = await db.orm.Pharmacy.where({ id: pharmacyId }).first()
  if (!pharmacy) return NextResponse.json({ error: 'Pharmacy not found' }, { status: 404 })

  await db.orm.Pharmacy.where({ id: pharmacyId }).update(patch)

  const updated: any = await db.orm.Pharmacy.where({ id: pharmacyId }).first()
  return NextResponse.json({
    pharmacy: {
      id: updated.id,
      name: updated.name,
      licenseNumber: updated.licenseNumber,
      licenseExpiry: updated.licenseExpiry ?? null,
      rxPaused: !!updated.rxPaused,
      isActive: !!updated.isActive,
    },
  })
}
