import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const pincode = searchParams.get('pincode') || ''

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({
        serviceable: false,
        reason: 'INVALID_PINCODE',
        message: 'Enter a valid 6-digit pincode.',
      })
    }

    const area: any = await db.orm.ServiceArea
      .where({ pincode, isActive: 1 })
      .first()

    if (!area) {
      return NextResponse.json({
        serviceable: false,
        reason: 'NOT_SERVICEABLE',
        message:
          'We are not delivering to this pincode yet. Leave your number and we will tell you the day we launch here.',
      })
    }

    const pharmacies: any[] = await db.orm.Pharmacy
      .where({ isActive: 1 })
      .all()

    return NextResponse.json({
      serviceable: true,
      reason: 'OK',
      city: area.city || null,
      region: area.region || null,
      pharmacyCount: pharmacies.length,
      message: 'Good news — we deliver to this pincode.',
    })
  } catch (err) {
    console.error('Serviceability check error:', err)
    return NextResponse.json(
      {
        serviceable: false,
        reason: 'CHECK_FAILED',
        message: 'We could not verify this pincode. Please try again.',
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { pincode, phone } = await req.json().catch(() => ({}))

    if (!/^\d{6}$/.test(pincode || '')) {
      return NextResponse.json(
        { error: 'A valid 6-digit pincode is required' },
        { status: 400 }
      )
    }
    if (!/^\d{10}$/.test(phone || '')) {
      return NextResponse.json(
        { error: 'A valid 10-digit mobile number is required' },
        { status: 400 }
      )
    }

    const existing: any = await db.orm.WaitlistEntry
      .where({ pincode, phone })
      .first()

    if (existing) {
      return NextResponse.json({
        registered: true,
        alreadyRegistered: true,
        message: `You are already on the list for ${pincode}. We will text you when we launch there.`,
      })
    }

    await db.orm.WaitlistEntry.create({
      id: randomUUID(),
      pincode,
      phone,
      notified: 0,
    })

    return NextResponse.json({
      registered: true,
      alreadyRegistered: false,
      message: `You are on the list. We will text you when we start delivering to ${pincode}.`,
    })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json(
      { error: 'Could not save your number. Please try again.' },
      { status: 500 }
    )
  }
}
