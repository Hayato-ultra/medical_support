import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Test admin overview queries
  const { data: customers, error: cErr } = await supabase.from('customers').select('*', { count: 'exact', head: true })
  console.log('Customers count:', customers, cErr)
  
  const { data: orders, error: oErr } = await supabase.from('orders').select('*').limit(5)
  console.log('Orders:', orders?.length, oErr)
  
  const { data: payments, error: pErr } = await supabase.from('payments').select('amount').eq('status', 'COMPLETED').limit(5)
  console.log('Payments:', payments?.length, pErr)
  
  const { data: prescriptions, error: rErr } = await supabase.from('prescriptions').select('status, verified_at, created_at').limit(5)
  console.log('Prescriptions:', prescriptions?.length, rErr)
  
  const { data: orderItems, error: oiErr } = await supabase.from('order_items').select('*', { count: 'exact', head: true })
  console.log('Order items:', orderItems, oiErr)
  
  const { data: allLines } = await supabase.from('order_items').select('*', { count: 'exact', head: true })
  console.log('All lines:', allLines)
}

main()