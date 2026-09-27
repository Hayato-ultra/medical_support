import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'
import {
  getActor,
  unauthorized,
  forbidden,
  hasRole,
  resolvePharmacyScope,
} from '@/lib/api/auth'

const PRESCRIPTION_DIR = path.join(process.cwd(), '.uploads', 'prescriptions')

/**
 * Serves locally stored prescription images during development. In production
 * uploads live in private object storage and are streamed through here.
 *
 * A random filename is not access control. The customer who owns the
 * prescription can always fetch it, and the dispensing pharmacy can fetch it
 * because it has to dispense against it. Any other pharmacy is refused, even
 * with a correct filename, so a guessed name cannot pull another store's
 * customer's health data.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const actor = await getActor()
  if (!actor) return unauthorized('Sign in to view prescriptions')

  const supabase = createReadOnlyApiClient()
  const { file } = await params
  // Reject any path traversal attempt.
  const safeName = path.basename(file)
  const full = path.join(PRESCRIPTION_DIR, safeName)

  if (!full.startsWith(PRESCRIPTION_DIR)) {
    return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
  }

  try {
    // Find the prescription this file belongs to.
    const { data: prescriptions } = await supabase
      .from('prescriptions')
      .select('*')
    const linked = (prescriptions || []).find((p) =>
      typeof p.image_url === 'string' && p.image_url.endsWith(safeName)
    )

    if (!linked) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    if (actor.role === 'CUSTOMER') {
      if (linked.customer_id !== actor.customerId) {
        return forbidden('That prescription belongs to another account')
      }
    } else if (hasRole(actor, 'PHARMACY_OWNER', 'PHARMACY_STAFF')) {
      const pharmacyId = await resolvePharmacyScope(actor)
      if (!pharmacyId) return forbidden('Your account is not linked to a pharmacy')
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('prescription_id', linked.id)
      const theirs = (orders || []).some((o) => o.pharmacy_id === pharmacyId)
      if (!theirs) {
        return forbidden('That prescription is not attached to your orders')
      }
    } else if (actor.role !== 'ADMIN') {
      return forbidden('You cannot view this prescription')
    }

    const data = await fs.readFile(full)
    const type = safeName.toLowerCase().endsWith('.pdf')
      ? 'application/pdf'
      : safeName.toLowerCase().endsWith('.png')
        ? 'image/png'
        : safeName.toLowerCase().endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg'

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}