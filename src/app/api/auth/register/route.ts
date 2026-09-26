import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingUser = await db.orm.User.where({ email }).first()
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userId = randomUUID()
    const userRole = role || 'CUSTOMER'

    const user = await db.orm.User.create({
      id: userId,
      email,
      phone: email,
      passwordHash,
      role: userRole as any,
    }) as any

    return NextResponse.json({ userId: user.id, role: userRole }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
