import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createReadOnlyApiClient } from '@/lib/supabase/api-client'

export async function GET(req: Request) {
  try {
    const supabase = createReadOnlyApiClient()
    const { searchParams } = new URL(req.url)
    const pincode = searchParams.get('pincode') || ''

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json({
        serviceable: false,
        reason: 'INVALID_PINCODE',
        message: 'Enter a valid 6-digit pincode.',
      })
    }

    const { data: area, error: areaError } = await supabase
      .from('service_areas')
      .select('*')
      .eq('pincode', pincode)
      .eq('is_active', true)
      .single()

    if (areaError || !area) {
      return NextResponse.json({
        serviceable: false,
        reason: 'NOT_SERVICEABLE',
        message:
          'We are not delivering to this pincode yet. Leave your number and we will tell you the day we launch here.',
      })
    }

    const { data: pharmacies } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_active', true)

    return NextResponse.json({
      serviceable: true,
      reason: 'OK',
      city: area.city || null,
      region: area.region || null,
      pharmacyCount: (pharmacies || []).length,
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
    const supabase = createReadOnlyApiClient()
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

    const { data: existing } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('pincode', pincode)
      .eq('phone', phone)
      .single()

    if (existing) {
      return NextResponse.json({
        registered: true,
        alreadyRegistered: true,
        message: `You are already on the list for ${pincode}. We will text you when we launch there.`,
      })
    }

    await supabase
      .from('waitlist_entries')
      .insert({
        id: randomUUID(),
        pincode,
        phone,
        notified: false,
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
