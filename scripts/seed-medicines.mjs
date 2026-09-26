import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { MEDICINES, displayName, displayStrength, brandKey } from './data/medicines.mjs'

const db = new DatabaseSync('medical_support.db')

const now = new Date().toISOString()

const medicines = MEDICINES
const insertMedicine = db.prepare(`
  INSERT INTO Medicine (id, name, manufacturer, dosageForm, strength, requiresPrescription, category, description, imageUrl)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
`)

const countRow = db.prepare('SELECT COUNT(*) as c FROM Medicine').get()

if (countRow.c === 0) {
  for (const m of medicines) {
    insertMedicine.run(
      randomUUID(),
      displayName(m),
      m.manufacturer,
      m.dosageForm,
      displayStrength(m),
      m.rx,
      m.category,
      m.description
    )
  }
  console.log(`inserted ${medicines.length} medicines`)
} else {
  console.log(`Medicine table already has ${countRow.c} rows, skipping seed`)
}

const medRows = db.prepare('SELECT id, name, category FROM Medicine').all()

const pharmacy = db.prepare('SELECT * FROM Pharmacy LIMIT 1').get()

let pharmacyId = pharmacy?.id
if (!pharmacyId) {
  pharmacyId = randomUUID()
  db.prepare(`
    INSERT INTO Pharmacy (id, name, licenseNumber, address, pincode, latitude, longitude, isActive, operatingHours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    pharmacyId,
    'Wellness Pharmacy',
    'MH-WP-2024-8891',
    '12, MG Road, Indore, Madhya Pradesh',
    '452001',
    22.7196,
    75.8577,
    1
  )
  console.log('inserted pharmacy: Wellness Pharmacy')
}

const inventoryCount = db.prepare('SELECT COUNT(*) as c FROM Inventory').get()
if (inventoryCount.c === 0) {
  const insertInventory = db.prepare(`
    INSERT INTO Inventory (id, pharmacyId, medicineId, quantity, price, batchNumber, expiryDate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  let i = 0
  for (const m of medRows) {
    // leave a couple of items out of stock to exercise the "alternative" path
    const outOfStock = i % 17 === 3
    const qty = outOfStock ? 0 : 20 + (i % 5) * 7
    // Sell at the catalogue price so a customer comparing two brands of the
    // same salt sees the real price difference rather than a seeded ramp.
    const entry = medicines.find((x) => brandKey(displayName(x)) === brandKey(m.name))
    insertInventory.run(
      randomUUID(),
      pharmacyId,
      m.id,
      qty,
      entry ? entry.price : 0,
      `BATCH${1000 + i}`,
      new Date(Date.now() + 300 * 86400000).toISOString()
    )
    i++
  }
  console.log(`inserted ${medRows.length} inventory rows`)
} else {
  console.log(`Inventory already has ${inventoryCount.c} rows, skipping`)
}

console.log('---')
console.log('medicines :', db.prepare('SELECT COUNT(*) as c FROM Medicine').get().c)
console.log('pharmacies:', db.prepare('SELECT COUNT(*) as c FROM Pharmacy').get().c)
console.log('inventory :', db.prepare('SELECT COUNT(*) as c FROM Inventory').get().c)
db.close()
