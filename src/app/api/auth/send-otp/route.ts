import { NextResponse } from 'next/server'
import { randomInt, randomUUID } from 'crypto'
import { db } from '@/lib/db/client'

const OTP_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 30 * 1000
const MAX_PER_HOUR = 5

/**
 * The code is only echoed back outside production, so a deployment with no SMS
 * gateway configured cannot be used to log in as any phone number.
 */
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const EXPOSE_OTP = !IS_PRODUCTION

export async function POST(req: Request) {
  try {
    const { phone } = await req.json().catch(() => ({}))

    if (!/^\d{10}$/.test(phone || '')) {
      return NextResponse.json(
        { error: 'Enter a valid 10-digit mobile number' },
        { status: 400 }
      )
    }

    const recent: any[] = await db.orm.OtpToken
      .where({ phone })
      .all()
    const now = Date.now()
    const live = recent.filter(
      (t) => new Date(t.expiresAt).getTime() > now && !t.used
    )

    if (live.length > 0 && now - new Date(live[0].createdAt).getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil(
        (RESEND_COOLDOWN_MS - (now - new Date(live[0].createdAt).getTime())) / 1000
      )
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another code` },
        { status: 429 }
      )
    }

    const lastHour = recent.filter(
      (t) => now - new Date(t.createdAt).getTime() < 60 * 60 * 1000
    )
    if (lastHour.length >= MAX_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many code requests. Try again in an hour.' },
        { status: 429 }
      )
    }

    // Invalidate any outstanding codes so only the newest one works.
    for (const token of live) {
      await db.orm.OtpToken.where({ id: token.id }).update({ used: 1 })
    }

    const otp = String(randomInt(100000, 1000000))
    const expiresAt = new Date(now + OTP_TTL_MS)

    await db.orm.OtpToken.create({
      id: randomUUID(),
      key: `otp:${phone}:${otp}`,
      phone,
      otp,
      expiresAt,
      used: 0,
    })

    const user: any = await db.orm.User.where({ phone }).first()

    const sent = await deliverOtp(phone, otp)

    // Outside production the code is returned in the response, so an
    // undelivered code is still usable. In production there is no fallback, so
    // a failed send must be reported instead of leaving the user waiting for an
    // SMS that will never arrive.
    if (IS_PRODUCTION && !sent) {
      return NextResponse.json(
        { error: 'We could not send a code right now. Please try again shortly.' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      message: user
        ? 'Code sent. Use it to sign in.'
        : 'Code sent. No account yet — register to continue.',
      exists: !!user,
      expiresInSeconds: OTP_TTL_MS / 1000,
      delivered: sent,
      // Never leak the code in production.
      ...(EXPOSE_OTP ? { devOtp: otp } : {}),
    })
  } catch (err) {
    console.error('Send OTP error:', err)
    return NextResponse.json(
      { error: 'Could not send the code. Try again.' },
      { status: 500 }
    )
  }
}

async function deliverOtp(phone: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID

  if (!authKey || !templateId) {
    console.log(`[otp] ${phone} -> ${otp} (no MSG91 credentials configured)`)
    return false
  }

  try {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: authKey },
      body: JSON.stringify({
        template_id: templateId,
        recipients: [{ mobiles: `91${phone}`, OTP: otp }],
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[otp] MSG91 delivery failed', err)
    return false
  }
}
