import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ADMIN_SECRET = process.env.ADMIN_API_SECRET || 'dev-admin-secret-123'

const testUsers = [
  {
    email: 'customer@test.com',
    password: 'test123456',
    role: 'CUSTOMER',
    name: 'Test Customer',
    phone: '9876543210'
  },
  {
    email: 'pharmacy@test.com',
    password: 'test123456',
    role: 'PHARMACY_OWNER',
    name: 'Test Pharmacy Owner',
    phone: '9876543211',
    pharmacyName: 'Test Pharmacy',
    licenseNumber: 'TEST-LIC-001',
    pharmacyAddress: '123 Test Street, Test City',
    pharmacyPincode: '110001'
  },
  {
    email: 'rider@test.com',
    password: 'test123456',
    role: 'RIDER',
    name: 'Test Rider',
    phone: '9876543212',
    vehicleType: 'BIKE',
    licensePlate: 'DL 01 AB 1234'
  },
  {
    email: 'admin@test.com',
    password: 'test123456',
    role: 'ADMIN',
    name: 'Test Admin'
  },
  {
    email: 'pharmacist@test.com',
    password: 'test123456',
    role: 'PHARMACY_STAFF',
    name: 'Test Pharmacist',
    phone: '9876543213'
  }
]

async function createUser(user: typeof testUsers[0]) {
  console.log(`Creating ${user.role}: ${user.email}...`)

  const res = await fetch('http://localhost:3000/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer dev-admin-secret-123`
    },
    body: JSON.stringify(user)
  })

  const result = await res.json()
  
  if (!res.ok) {
    console.error(`Failed to create ${user.email}:`, result)
    return false
  }
  
  console.log(`✓ Created ${user.role}: ${user.email} (${result.user?.id})`)
  return true
}

async function main() {
  console.log('Creating test users...\n')
  
  for (const user of testUsers) {
    await createUser(user)
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000))
  }
  
  console.log('\n✓ All test users created!')
  console.log('\nTest Credentials:')
  console.log('  Customer:     customer@test.com     / test123456')
  console.log('  Pharmacy:     pharmacy@test.com     / test123456')
  console.log('  Rider:        rider@test.com        / test123456')
  console.log('  Admin:        admin@test.com        / test123456')
  console.log('  Pharmacist:   pharmacist@test.com   / test123456')
}

main().catch(console.error)