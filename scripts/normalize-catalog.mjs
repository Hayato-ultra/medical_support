import 'dotenv/config'
import { DatabaseSync } from 'node:sqlite'
import {
  MEDICINES,
  displayName,
  displayStrength,
  brandKey,
} from './data/medicines.mjs'

/**
 * Rebuilds catalog display names, strengths and shelf prices from the canonical
 * catalogue in scripts/data/medicines.mjs.
 *
 * Rows are matched on the brand, the stable leading token of the current name.
 * Idempotent by construction, unlike the earlier heuristic scripts that guessed
 * the brand/generic boundary and mangled multi-word generics such as
 * "Losartan Potassium" and "Ascorbic acid".
 *
 * Prices are only rewritten when they differ from the catalogue, so pharmacy
 * price edits made through the dashboard are preserved.
 */
const db = new DatabaseSync(process.env.DATABASE_URL ?? './medical_support.db')
const SYNC_PRICES = process.argv.includes('--prices')

const byBrand = [...MEDICINES].sort((a, b) => b.name.length - a.name.length)
const findEntry = (name) => byBrand.find((m) => brandKey(name).startsWith(brandKey(m.name)))

const updateMed = db.prepare('UPDATE Medicine SET name = ?, strength = ? WHERE id = ?')
const updatePrice = db.prepare('UPDATE Inventory SET price = ? WHERE medicineId = ?')

let renamed = 0
let repriced = 0
let unmatched = 0

for (const row of db.prepare('SELECT id, name, strength FROM Medicine').all()) {
  const entry = findEntry(row.name)
  if (!entry) {
    unmatched++
    console.log(`  ! no catalogue match for "${row.name}"`)
    continue
  }

  const name = displayName(entry)
  const strength = displayStrength(entry)
  if (name !== row.name || strength !== row.strength) {
    updateMed.run(name, strength, row.id)
    renamed++
  }
}

if (SYNC_PRICES) {
  for (const row of db.prepare('SELECT id, name FROM Medicine').all()) {
    const entry = findEntry(row.name)
    if (!entry) continue
    const changed = updatePrice.run(entry.price, row.id)
    if (changed.changes) repriced++
  }
}

console.log(
  `Rebuilt ${renamed} catalog row(s)${SYNC_PRICES ? `, repriced ${repriced} inventory row(s)` : ''} (${unmatched} unmatched).`
)

if (process.argv.includes('--verbose')) {
  for (const m of db
    .prepare(
      `SELECT m.name, m.strength, i.price, i.quantity
       FROM Medicine m LEFT JOIN Inventory i ON i.medicineId = m.id
       ORDER BY m.name`
    )
    .all()) {
    console.log(`  ${m.name}  [${m.strength}]  Rs ${m.price}  qty ${m.quantity}`)
  }
}
db.close()
