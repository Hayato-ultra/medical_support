/**
 * Removes rows created by smoke runs so a re-run starts clean and the committed
 * database does not collect test accounts.
 *
 * Phones come from scripts/.smoke-phones.json, written by the last smoke run,
 * plus any SMOKE_PHONE passed in and the old fixed phone from earlier runs.
 * Safe to run repeatedly.
 */
import 'dotenv/config'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const LEGACY_SMOKE_PHONE = '9876543210'
// Accounts created by hand while debugging, which no run can identify later.
const EXTRA_TEST_EMAILS = ['d@mail.com']
const PHONE_FILE = path.join(import.meta.dirname, '.smoke-phones.json')
const db = new DatabaseSync(process.env.DATABASE_URL ?? './medical_support.db')

const phones = new Set([LEGACY_SMOKE_PHONE])
if (process.env.SMOKE_PHONE) phones.add(process.env.SMOKE_PHONE)
if (existsSync(PHONE_FILE)) {
  for (const p of JSON.parse(readFileSync(PHONE_FILE, 'utf8'))) phones.add(p)
}

const placeholders = [...phones].map(() => '?').join(',')

/**
 * Accounts to remove: the phones this project generated for tests, plus every
 * `@phone.local` account. That domain is synthesised for phone signups, so in a
 * real deployment it only ever holds development data.
 */
const users = db
  .prepare(
    `SELECT id, phone, role FROM User
     WHERE phone IN (${placeholders})
        OR email LIKE '%@phone.local'
        OR email IN (${EXTRA_TEST_EMAILS.map(() => '?').join(',')})`
  )
  .all(...phones, ...EXTRA_TEST_EMAILS)

for (const u of users) phones.add(u.phone)

/**
 * Stock is decremented when an order is placed, so deleting the order has to
 * put it back.
 *
 * Cancelled and rejected orders are the exception: the application already
 * released their stock at that point, so adding it again would quietly inflate
 * inventory on every run.
 */
const STOCK_ALREADY_RELEASED = new Set(['CANCELLED', 'RX_REJECTED'])

function restoreStock(orderId, status) {
  if (STOCK_ALREADY_RELEASED.has(String(status))) return
  const items = db.prepare('SELECT * FROM OrderItem WHERE orderId = ?').all(orderId)
  for (const item of items) {
    db.prepare(
      `UPDATE Inventory SET quantity = quantity + ?
       WHERE pharmacyId = (SELECT pharmacyId FROM "Order" WHERE id = ?)
         AND medicineId = ?`
    ).run(item.quantity, orderId, item.medicineId)
  }
}

let removedOrders = 0
let removedUsers = 0

for (const u of users) {
  for (const c of db.prepare('SELECT id FROM Customer WHERE userId = ?').all(u.id)) {
    for (const o of db.prepare('SELECT id, status FROM "Order" WHERE customerId = ?').all(c.id)) {
      restoreStock(o.id, o.status)
      db.prepare('DELETE FROM OrderItem WHERE orderId = ?').run(o.id)
      db.prepare('DELETE FROM TrackingEvent WHERE orderId = ?').run(o.id)
      db.prepare('DELETE FROM Payment WHERE orderId = ?').run(o.id)
      db.prepare('DELETE FROM "Order" WHERE id = ?').run(o.id)
      removedOrders++
    }
    for (const r of db.prepare('SELECT id FROM Prescription WHERE customerId = ?').all(c.id)) {
      db.prepare('DELETE FROM PrescriptionLibrary WHERE prescriptionId = ?').run(r.id)
    }
    db.prepare('DELETE FROM Prescription WHERE customerId = ?').run(c.id)
    db.prepare('DELETE FROM Address WHERE customerId = ?').run(c.id)
    db.prepare('DELETE FROM Customer WHERE id = ?').run(c.id)
  }

  // A rider picked up by an order has to be freed before the row goes.
  for (const r of db.prepare('SELECT id FROM Rider WHERE userId = ?').all(u.id)) {
    db.prepare('UPDATE Rider SET isAvailable = 1 WHERE id = ?').run(r.id)
    db.prepare('UPDATE "Order" SET riderId = NULL WHERE riderId = ?').run(r.id)
    db.prepare('DELETE FROM Rider WHERE id = ?').run(r.id)
  }

  // The pharmacy a smoke owner registered is its own inactive row. It is
  // removed by the orphan sweep below once this user no longer references it,
  // because signup may have re-pointed the staff row at the seeded pharmacy.
  db.prepare('DELETE FROM PharmacyStaff WHERE userId = ?').run(u.id)
  db.prepare('DELETE FROM OtpToken WHERE phone = ?').run(u.phone)
  db.prepare('DELETE FROM User WHERE id = ?').run(u.id)
  removedUsers++
  console.log(`removed user ${u.phone} (${u.role})`)
}

for (const p of phones) {
  const n = db.prepare('DELETE FROM WaitlistEntry WHERE phone = ?').run(p)
  if (n.changes) console.log(`removed ${n.changes} waitlist row(s) for ${p}`)
}

// Pharmacies orphaned by an earlier interrupted run: inactive, never used and
// with nobody left attached. The seeded pharmacy is active, so it is never
// matched, and the staff check keeps it safe even if it were deactivated.
{
  const orphans = db
    .prepare(
      `SELECT p.id, p.name FROM Pharmacy p
       WHERE p.isActive = 0
         AND NOT EXISTS (SELECT 1 FROM "Order" o WHERE o.pharmacyId = p.id)
         AND NOT EXISTS (SELECT 1 FROM PharmacyStaff s WHERE s.pharmacyId = p.id)
         AND NOT EXISTS (SELECT 1 FROM Inventory i WHERE i.pharmacyId = p.id)`
    )
    .all()
  for (const p of orphans) {
    db.prepare('DELETE FROM Pharmacy WHERE id = ?').run(p.id)
    console.log(`removed unused pharmacy ${p.name} (${p.id})`)
  }
}

// Inventory must never sit at zero or below after a test run.
{
  const bad = db.prepare('SELECT id, medicineId, quantity FROM Inventory WHERE quantity <= 0').all()
  for (const row of bad) {
    console.log(`WARNING inventory ${row.id} (medicine ${row.medicineId}) is at ${row.quantity}`)
  }
}

console.log(
  removedUsers || removedOrders
    ? `cleanup complete: ${removedUsers} user(s), ${removedOrders} order(s)`
    : 'nothing to clean'
)
db.close()
