import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface CreateUserBody {
  email: string
  password: string
  role: 'CUSTOMER' | 'PHARMACY_OWNER' | 'PHARMACY_STAFF' | 'RIDER' | 'ADMIN'
  name: string
  phone?: string
  pharmacyName?: string
  licenseNumber?: string
  pharmacyAddress?: string
  pharmacyPincode?: string
  vehicleType?: string
  licensePlate?: string
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin secret (simple protection for dev)
    const authHeader = req.headers.get('authorization')
    const adminSecret = process.env.ADMIN_API_SECRET || 'dev-admin-secret-123'
    
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateUserBody = await req.json()
    const { email, password, role, name, phone, pharmacyName, licenseNumber, pharmacyAddress, pharmacyPincode, vehicleType, licensePlate } = body

    if (!email || !password || !role || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create auth user
    const { data: authData, error: authError } = await getSupabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation for test users
      user_metadata: { role, name }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: 'Auth creation failed',
        details: authError
      }, { status: 400 })
    }

    const userId = authData.user.id

    // Create user profile
    const { error: profileError } = await getSupabaseAdmin().from('users').upsert({
      id: userId,
      email,
      role: role.toUpperCase(),
      name,
      phone: phone || ''
    })
    if (profileError) throw profileError

    // Create role-specific records
    if (role === 'CUSTOMER') {
      const { error } = await getSupabaseAdmin().from('customers').insert({
        user_id: userId,
        name,
        phone: phone || ''
      })
      if (error) throw error
    } else if (role === 'PHARMACY_OWNER') {
      if (!pharmacyName || !licenseNumber || !pharmacyAddress || !pharmacyPincode) {
        return NextResponse.json({ error: 'Pharmacy details required for pharmacy owner' }, { status: 400 })
      }
      const { data: pharmacy, error: pharmacyError } = await getSupabaseAdmin().from('pharmacies').insert({
        name: pharmacyName,
        license_number: licenseNumber,
        address: pharmacyAddress,
        pincode: pharmacyPincode,
        latitude: 0,
        longitude: 0,
        is_active: true // Test pharmacy is active by default
      }).select().single()
      if (pharmacyError) throw pharmacyError

      await getSupabaseAdmin().from('pharmacy_staff').insert({
        user_id: userId,
        pharmacy_id: pharmacy.id,
        role: 'OWNER'
      })
    } else if (role === 'PHARMACY_STAFF') {
      // Would need pharmacy_id - skip for now
    } else if (role === 'RIDER') {
      if (!vehicleType || !licensePlate) {
        return NextResponse.json({ error: 'Vehicle details required for rider' }, { status: 400 })
      }
      const { error } = await getSupabaseAdmin().from('riders').insert({
        user_id: userId,
        name,
        phone: phone || '',
        vehicle_type: vehicleType,
        license_plate: licensePlate
      })
      if (error) throw error
    } else if (role === 'ADMIN') {
      // Admin only needs user profile
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: userId, email, role, name }
    })

  } catch (error) {
    console.error('Create user error:', error)
    let message = 'Failed to create user'
    let details: any = {}
    
    if (error instanceof Error) {
      message = error.message
      details = { stack: error.stack }
    } else if (error && typeof error === 'object') {
      // Supabase errors are often objects with message/code
      message = (error as any).message || JSON.stringify(error)
      details = error
    }
    
    return NextResponse.json({ 
      error: message,
      details
    }, { status: 500 })
  }
}