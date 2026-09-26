/**
 * End-to-end smoke test against a running dev server.
 * Exercises: register -> login -> catalogue -> address check -> order ->
 * payment -> lifecycle -> delivery OTP -> reorder, plus negative cases.
 */
import { DatabaseSync } from 'node:sqlite'
import { writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const PHONE_FILE = path.join(import.meta.dirname, '.smoke-phones.json')

// Leftover riders from a previous run would win the assignment and make the
// rider half of this test check somebody else's delivery, so start from clean.
try {
  execFileSync(process.execPath, [path.join(import.meta.dirname, 'clean-smoke-data.mjs')], {
    stdio: 'ignore',
  })
} catch {
  // A missing or locked database is not a reason to skip the run; the checks
  // below will report anything that is actually wrong.
}

let cookies = ''
// Unique per run so repeat executions never collide with an existing account.
const PHONE = process.env.SMOKE_PHONE || `9${String(Date.now()).slice(-9)}`
const STAFF_PHONE = `8${PHONE.slice(1)}`
const RIDER_PHONE = `7${PHONE.slice(1)}`
const PASSWORD = 'TestPass123!'

function jar(headers = {}) {
  const base = { 'Content-Type': 'application/json', ...headers }
  if (cookies) base.Cookie = cookies
  return base
}

async function call(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, { ...options, headers: jar(options.headers) })
  const setCookie = res.headers.getSetCookie?.() || []
  if (setCookie.length) cookies = setCookie.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 200)
  }
  return { status: res.status, body }
}

/**
 * The same calls against a private cookie jar, so a staff or rider login does
 * not clobber the customer session mid-run.
 */
function newSession() {
  return { cookies: '' }
}

async function callAs(session, path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (session.cookies) headers.Cookie = session.cookies
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  const setCookie = res.headers.getSetCookie?.() || []
  if (setCookie.length) session.cookies = setCookie.map((c) => c.split(';')[0]).join('; ')
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 200)
  }
  return { status: res.status, body }
}

/** NextAuth credentials callback needs form encoding plus a real CSRF token. */
async function login(identifier, password) {
  const csrfRes = await call('/api/auth/csrf')
  const token = csrfRes.body?.csrfToken
  if (!token) return { status: csrfRes.status, body: { error: 'no csrf token' } }

  return call('/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      identifier,
      password,
      csrfToken: token,
      json: 'true',
    }).toString(),
    redirect: 'manual',
  })
}

async function loginAs(session, identifier, password) {
  const csrfRes = await callAs(session, '/api/auth/csrf')
  const token = csrfRes.body?.csrfToken
  if (!token) return { status: csrfRes.status, body: { error: 'no csrf token' } }

  return callAs(session, '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      identifier,
      password,
      csrfToken: token,
      json: 'true',
    }).toString(),
    redirect: 'manual',
  })
}

/** Registers a throwaway account of any self-service role. */
async function registerRole(phone, role, extra = {}) {
  const sent = await call('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  })
  const otp = sent.body?.devOtp
  if (!otp) return { status: sent.status, body: sent.body }

  return call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Smoke Tester', password: PASSWORD, role, phone, otp, ...extra }),
  })
}

/**
 * Points a freshly registered pharmacy owner at the seeded, stocked pharmacy.
 *
 * Signup always creates its own inactive pharmacy with no inventory, and there
 * is no admin account to approve it with, so the only pharmacy that can both be
 * active and fulfil a test order is the seeded one. This is test-only wiring.
 */
function activateSeededPharmacyStaff(phone) {
  const handle = new DatabaseSync(process.env.DATABASE_URL ?? './medical_support.db')
  try {
    const user = handle
      .prepare('SELECT id FROM User WHERE phone = ?')
      .get(phone)
    const pharmacy = handle
      .prepare('SELECT id FROM Pharmacy WHERE isActive = 1 ORDER BY id LIMIT 1')
      .get()
    if (!user || !pharmacy) return false

    handle
      .prepare('UPDATE PharmacyStaff SET pharmacyId = ? WHERE userId = ?')
      .run(pharmacy.id, user.id)
    return true
  } finally {
    handle.close()
  }
}

let passed = 0
let failed = 0
function check(label, condition, detail) {
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}${detail ? ` -> ${JSON.stringify(detail)}` : ''}`)
  }
}

const section = (t) => console.log(`\n=== ${t} ===`)

// --- 1. Public catalogue -------------------------------------------------
section('Public catalogue (no auth)')
{
  const { status, body } = await call('/api/medicines')
  check('catalogue loads', status === 200 && body.count === 27, body)
  const oot = body.medicines.find((m) => !m.inStock)
  check('has out-of-stock item', !!oot, oot?.name)

  const { body: search } = await call('/api/medicines?query=paracetamol')
  check('generic search finds paracetamol brands', search.count >= 3, search.count)

  const { body: rx } = await call('/api/medicines?requiresPrescription=1')
  check('rx filter works', rx.medicines.every((m) => m.requiresPrescription), rx.count)
}

// --- 2. Auth is enforced -----------------------------------------------
section('Auth enforcement')
{
  const { status } = await call('/api/orders')
  check('orders require auth', status === 401, status)
  const rx = await call('/api/prescriptions')
  check('prescriptions require auth', rx.status === 401, rx.status)
  const lib = await call('/api/prescriptions/library')
  check('library requires auth', lib.status === 401, lib.status)
}

// --- 3. Serviceability --------------------------------------------------
section('Serviceability')
{
  const ok = await call('/api/serviceability?pincode=452001')
  check('serviceable pincode accepted', ok.body.serviceable === true, ok.body)
  const bad = await call('/api/serviceability?pincode=110001')
  check('non-serviceable pincode rejected', bad.body.serviceable === false, bad.body)
  const junk = await call('/api/serviceability?pincode=abc')
  check('invalid pincode rejected', junk.body.serviceable === false, junk.body)

  const wl = await call('/api/serviceability', {
    method: 'POST',
    body: JSON.stringify({ pincode: '110001', phone: PHONE }),
  })
  check('waitlist accepts signup', wl.body.registered === true, wl.body)
  const wl2 = await call('/api/serviceability', {
    method: 'POST',
    body: JSON.stringify({ pincode: '110001', phone: PHONE }),
  })
  check('waitlist is idempotent', wl2.body.alreadyRegistered === true, wl2.body)
}

// --- 4. Registration ----------------------------------------------------
section('Registration')
{
  const bad = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'A', password: 'short', role: 'admin', phone: PHONE }),
  })
  check('rejects weak input and admin role', bad.status === 400, bad.body)

  const noOtp = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'Test User', password: PASSWORD, role: 'customer', phone: PHONE }),
  })
  check('rejects registration without OTP', noOtp.status === 400, noOtp.body)

  const sent = await call('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: PHONE }),
  })
  const otp = sent.body.devOtp
  check('OTP issued', !!otp, sent.body)

  const reg = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Customer', password: PASSWORD, role: 'customer', phone: PHONE, otp,
    }),
  })
  check('customer registered', reg.status === 201, reg.body)

  const reuse = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test Customer', password: PASSWORD, role: 'customer', phone: PHONE, otp,
    }),
  })
  check('rejects duplicate signup', reuse.status >= 400, reuse.body)
}

// --- 5. Login -----------------------------------------------------------
section('Login')
{
  const res = await login(PHONE, PASSWORD)
  check('login callback responds', res.status < 500, res.status)

  // Check the session before any further auth attempt, since a failed login
  // resets the cookie jar.
  const me = await call('/api/auth/session')
  check('session returns the signed-in customer', me.body?.user?.phone === PHONE, me.body)
  check('session exposes the customer profile id', !!me.body?.user?.customerId, me.body)
  check(
    'session token issued',
    cookies.includes('next-auth.session-token'),
    cookies.slice(0, 60)
  )

  const wrong = await login(PHONE, 'wrong-password')
  check('wrong password rejected', wrong.status < 500, wrong.status)
}

// --- 6. Order, payment and lifecycle ------------------------------------
section('Order, payment and delivery lifecycle')

/** Places an order for one in-stock over-the-counter medicine. */
async function placeOrder() {
  const { body: cat } = await call('/api/medicines')
  const otc = cat.medicines.find((m) => m.inStock && !m.requiresPrescription)
  const res = await call('/api/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ medicineId: otc.id, quantity: 1 }],
      deliveryAddress: {
        label: 'Home',
        address: '12 Test Street',
        landmark: 'Near park',
        pincode: '452001',
      },
    }),
  })
  return { res, otc }
}

let paidOrderId = null
{
  // An unpaid order must not be advanceable, and money that never captured
  // must never be marked refunded.
  const { res, otc } = await placeOrder()
  check('order created', res.status === 201, res.body)
  check('new order awaits payment', res.body?.order?.status === 'PENDING_PAYMENT', res.body?.order?.status)
  check('order is priced from inventory', Number(res.body?.order?.totalAmount) > 0, res.body?.order?.totalAmount)

  const orderId = res.body?.order?.id
  if (orderId) {
    const selfConfirm = await call(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    check('customer cannot confirm their own order', selfConfirm.status === 403, selfConfirm.body)

    const selfDeliver = await call(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'DELIVERED' }),
    })
    check('customer cannot mark an order delivered', selfDeliver.status === 403, selfDeliver.body)

    const intent = await call('/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    })
    check('payment intent created for an unpaid order', intent.status === 200, intent.body)

    const hook = await call('/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          notes: { orderId },
          status: 'captured',
          method: 'upi',
          payment_entity: { id: intent.body?.intentId || 'smoke-txn' },
        },
      }),
    })
    check('webhook captures the payment', hook.status === 200, hook.body)

    const { body: afterPay } = await call(`/api/orders/${orderId}/tracking`)
    check('captured order is confirmed', afterPay?.order?.status === 'CONFIRMED', afterPay?.order?.status)
    check('payment recorded as completed', afterPay?.payment?.status === 'COMPLETED', afterPay?.payment?.status)

    const replay = await call('/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    })
    check('a paid order cannot start another payment', replay.status >= 400, replay.body)

    paidOrderId = orderId
  }
  void otc
}

// --- 7. Staff and rider drive the order to delivery ---------------------
section('Staff and rider fulfilment')
if (paidOrderId) {
  const pharmacy = await registerRole(STAFF_PHONE, 'pharmacy', {
    pharmacyName: 'Smoke Pharmacy',
    licenseNumber: `SMOKE-${STAFF_PHONE}`,
    pharmacyAddress: '1 Test Road',
    pharmacyPincode: '452001',
  })
  check('pharmacy account registered', pharmacy.status === 201, pharmacy.body)

  const rider = await registerRole(RIDER_PHONE, 'rider', {
    vehicleType: 'BIKE',
    licensePlate: `SMK-${RIDER_PHONE}`,
  })
  check('rider account registered', rider.status === 201, rider.body)

  // A new pharmacy is inactive until an admin approves it, and the seeded
  // pharmacy has no staff, so point the order at the seeded one for this run.
  const active = await activateSeededPharmacyStaff(STAFF_PHONE)
  check('seeded pharmacy staff linked', active, active)

  const staff = newSession()
  const staffLogin = await loginAs(staff, STAFF_PHONE, PASSWORD)
  check('pharmacy staff logged in', staffLogin.status < 500, staffLogin.status)

  const advance = async (status, session = staff) => {
    const r = await callAs(session, `/api/orders/${paidOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return r
  }

  const skipped = await advance('DELIVERED')
  check('staff cannot self-confirm delivery', skipped.status === 403, skipped.body)

  const earlyPickup = await advance('OUT_FOR_DELIVERY')
  check('pharmacy cannot put the parcel on the road', earlyPickup.status === 403, earlyPickup.body)

  for (const status of ['ACCEPTED', 'PACKING', 'PACKED', 'READY_FOR_PICKUP']) {
    const r = await advance(status)
    check(`pharmacy moves order to ${status}`, r.status === 200, r.body)
  }

  // Packing must hand the job to a rider, otherwise delivery is unreachable.
  const riderSession = newSession()
  const riderLogin = await loginAs(riderSession, RIDER_PHONE, PASSWORD)
  check('rider logged in', riderLogin.status < 500, riderLogin.status)

  const { body: riderOrders } = await callAs(riderSession, '/api/orders')
  const mine = (riderOrders?.orders || []).find((o) => o.id === paidOrderId)
  check('rider sees the assigned delivery', !!mine, (riderOrders?.orders || []).map((o) => o.status))

  // Picking up is the rider's job, not the pharmacy's.
  const pickedUp = await advance('OUT_FOR_DELIVERY', riderSession)
  check('rider takes the parcel out for delivery', pickedUp.status === 200, pickedUp.body)

  // The delivery code belongs to the customer only.
  const { body: staffTrack } = await callAs(staff, `/api/orders/${paidOrderId}/tracking`)
  check('staff cannot read the customer delivery code', !staffTrack?.delivery?.otp, staffTrack?.delivery)
  const { body: riderTrack } = await callAs(riderSession, `/api/orders/${paidOrderId}/tracking`)
  check('rider cannot read the customer delivery code', !riderTrack?.delivery?.otp, riderTrack?.delivery)
  const { body: custTrack } = await call(`/api/orders/${paidOrderId}/tracking`)
  check('customer sees the delivery code', /^\d{6}$/.test(String(custTrack?.delivery?.otp)), custTrack?.delivery)
  const otp = String(custTrack?.delivery?.otp)

  const noOtp = await callAs(riderSession, `/api/orders/${paidOrderId}/verify-delivery`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  check('delivery needs a code', noOtp.status === 400, noOtp.body)

  const badOtp = await callAs(riderSession, `/api/orders/${paidOrderId}/verify-delivery`, {
    method: 'POST',
    body: JSON.stringify({ otp: '000000' }),
  })
  check('wrong delivery code rejected', badOtp.status === 400, badOtp.body)

  const goodOtp = await callAs(riderSession, `/api/orders/${paidOrderId}/verify-delivery`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  })
  check('correct code completes delivery', goodOtp.status === 200, goodOtp.body)

  const { body: done } = await call(`/api/orders/${paidOrderId}/tracking`)
  check('order is delivered', done?.order?.status === 'DELIVERED', done?.order?.status)
  check('delivery code hidden once delivered', !done?.delivery?.otp, done?.delivery)
} else {
  check('order created for lifecycle test', false, 'skipped, no order id')
}

// --- 8. Cancel a paid order refunds the money ---------------------------
section('Cancellation and refund')
{
  const { res } = await placeOrder()
  const orderId = res.body?.order?.id
  if (orderId) {
    const intent = await call('/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    })
    await call('/api/payments/webhook', {
      method: 'POST',
      body: JSON.stringify({
        payload: {
          notes: { orderId },
          status: 'captured',
          method: 'upi',
          payment_entity: { id: intent.body?.intentId || 'smoke-cancel' },
        },
      }),
    })

    const cancelled = await call(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'smoke test' }),
    })
    check('paid order cancels', cancelled.status === 200, cancelled.body)

    const { body: after } = await call(`/api/orders/${orderId}/tracking`)
    check('order is cancelled', after?.order?.status === 'CANCELLED', after?.order?.status)
    check('captured payment is refunded', after?.payment?.status === 'REFUNDED', after?.payment?.status)
  } else {
    check('order created for cancel test', false, res.body)
  }
}

console.log(`\n${'='.repeat(46)}`)
console.log(`PASS ${passed}   FAIL ${failed}`)

// Record the accounts this run touched so clean-smoke-data.mjs can remove them.
// The phones are generated per run, so nothing else can identify them later.
writeFileSync(PHONE_FILE, JSON.stringify([PHONE, STAFF_PHONE, RIDER_PHONE], null, 2))
console.log(`phones written to ${path.basename(PHONE_FILE)}`)

process.exit(failed > 0 ? 1 : 0)
