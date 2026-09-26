import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json()

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone and OTP are required' },
        { status: 400 }
      )
    }

    const token = await db.orm.OtpToken
      .where({ key: `otp:${phone}:${otp}` })
      .first()

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Invalid OTP' }, { status: 400 })
    }

    if (token.used) {
      return NextResponse.json(
        { valid: false, error: 'OTP already used' },
        { status: 400 }
      )
    }

    if (new Date(token.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'OTP expired' },
        { status: 400 }
      )
    }

    const user = await db.orm.User.where({ phone }).first()

    return NextResponse.json({
      valid: true,
      exists: !!user,
      userId: user?.id ?? null,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { valid: false, error: 'Verification failed' },
      { status: 500 }
    )
  }
}
