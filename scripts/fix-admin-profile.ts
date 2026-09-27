import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  const adminAuth = authUsers.users.find(u => u.email === 'admin@test.com')
  console.log('Auth user:', adminAuth?.id, adminAuth?.email, adminAuth?.user_metadata)
  
  const { data: profile, error } = await supabase.from('users').select('*').eq('email', 'admin@test.com').single()
  console.log('Profile:', profile, error)
  
  if (adminAuth) {
    const { error } = await supabase.from('users').upsert({
      id: adminAuth.id,
      email: 'admin@test.com',
      role: 'ADMIN',
      name: 'Test Admin',
      phone: ''
    })
    console.log('Upsert error:', error)
    
    const { data: fixed } = await supabase.from('users').select('*').eq('email', 'admin@test.com').single()
    console.log('Fixed profile:', fixed)
  }
}

main()