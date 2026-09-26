import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'

/**
 * Self-service signup roles. ADMIN is deliberately absent — an admin account
 * must be provisioned by another admin, never by an open registration form.
 */
const ROLE_MAP: Record<string, string> = {
  customer: 'CUSTOMER',
  pharmacy: 'PHARMACY_OWNER',
  rider: 'RIDER',
}

const VEHICLE_TYPES = ['BIKE', 'SCOOTER', 'CAR', 'CYCLE']

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      email, password, name, role, phone, otp,
      pharmacyName, licenseNumber, pharmacyAddress, pharmacyPincode,
      vehicleType, licensePlate,
    } = body

    const resolvedRole = ROLE_MAP[String(role || 'customer').toLowerCase()]
    if (!resolvedRole) {
      return NextResponse.json(
        { error: 'Choose a valid account type' },
        { status: 400 }
      )
    }

    if (!name || String(name).trim().length < 2) {
      return NextResponse.json({ error: 'Enter your full name' }, { status: 400 })
    }
    if (!password || String(password).length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }
    if (!/^\d{10}$/.test(phone || '')) {
      return NextResponse.json(
        { error: 'Enter a valid 10-digit mobile number' },
        { status: 400 }
      )
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email address' },
        { status: 400 }
      )
    }
    if (!otp) {
      return NextResponse.json(
        { error: 'Enter the OTP we sent to your phone' },
        { status: 400 }
      )
    }

    const token: any = await db.orm.OtpToken
      .where({ key: `otp:${phone}:${otp}` })
      .first()

    if (
      !token ||
      token.used ||
      new Date(token.expiresAt).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: 'That OTP is invalid or expired. Request a new one.' },
        { status: 400 }
      )
    }

    // Role-specific onboarding data is required up front, otherwise the
    // dashboard would be empty the moment the person signs in.
    if (resolvedRole === 'PHARMACY_OWNER') {
      if (!pharmacyName || !licenseNumber || !pharmacyPincode) {
        return NextResponse.json(
          {
            error:
              'Pharmacy name, licence number and pincode are required to register a pharmacy',
          },
          { status: 400 }
        )
      }
      if (!/^\d{6}$/.test(pharmacyPincode)) {
        return NextResponse.json(
          { error: 'Enter a valid 6-digit pharmacy pincode' },
          { status: 400 }
        )
      }
      const existingPharmacy: any = await db.orm.Pharmacy
        .where({ licenseNumber })
        .first()
      if (existingPharmacy) {
        return NextResponse.json(
          { error: 'That pharmacy licence number is already registered' },
          { status: 409 }
        )
      }
    }

    if (resolvedRole === 'RIDER') {
      if (!VEHICLE_TYPES.includes(String(vehicleType || '').toUpperCase())) {
        return NextResponse.json(
          { error: 'Choose a valid vehicle type' },
          { status: 400 }
        )
      }
      if (!licensePlate || String(licensePlate).trim().length < 4) {
        return NextResponse.json(
          { error: 'Enter your vehicle registration number' },
          { status: 400 }
        )
      }
    }

    const existingUser: any = await db.orm.User.where({ phone }).first()
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this mobile number already exists' },
        { status: 409 }
      )
    }

    if (email) {
      const byEmail: any = await db.orm.User.where({ email }).first()
      if (byEmail) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userId = randomUUID()
    const resolvedEmail = email || `${phone}@phone.local`

    await db.orm.User.create({
      id: userId,
      email: resolvedEmail,
      phone,
      passwordHash,
      role: resolvedRole,
    })

    if (resolvedRole === 'CUSTOMER') {
      await db.orm.Customer.create({
        id: randomUUID(),
        userId,
        name: String(name).trim(),
        phone,
      })
    }

    if (resolvedRole === 'PHARMACY_OWNER') {
      const pharmacyId = randomUUID()
      await db.orm.Pharmacy.create({
        id: pharmacyId,
        name: String(pharmacyName).trim(),
        licenseNumber: String(licenseNumber).trim(),
        address: String(pharmacyAddress || '').trim(),
        pincode: pharmacyPincode,
        latitude: 0,
        longitude: 0,
        isActive: 0,
        operatingHours: null,
      })
      await db.orm.PharmacyStaff.create({
        id: randomUUID(),
        userId,
        pharmacyId,
        role: 'OWNER',
      })
    }

    if (resolvedRole === 'RIDER') {
      await db.orm.Rider.create({
        id: randomUUID(),
        userId,
        name: String(name).trim(),
        phone,
        vehicleType: String(vehicleType).toUpperCase(),
        licensePlate: String(licensePlate).trim().toUpperCase(),
        isAvailable: 1,
        currentLat: null,
        currentLng: null,
      })
    }

    await db.orm.OtpToken.where({ id: token.id }).update({ used: 1 })

    return NextResponse.json(
      {
        userId,
        role: resolvedRole,
        phone,
        nextStep:
          resolvedRole === 'PHARMACY_OWNER'
            ? 'WAITING_FOR_APPROVAL'
            : 'SIGN_IN',
        message:
          resolvedRole === 'PHARMACY_OWNER'
            ? 'Account created. Your pharmacy stays inactive until an admin approves your licence.'
            : 'Account created. Sign in to continue.',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Registration error:', err)
    return NextResponse.json(
      { error: 'Could not create your account. Try again.' },
      { status: 500 }
    )
  }
}
