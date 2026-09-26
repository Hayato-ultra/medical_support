import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(process.env.DATABASE_URL ?? './medical_support.db')

const checks = [
  ['tables present', `SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name IN
     ('ServiceArea','WaitlistEntry','OtpToken','PrescriptionLibrary','OrderItem','Inventory')`],
]

const [label, sql] = checks[0]
console.log(label, '->', db.prepare(sql).get().c, '/ 6')

const cols = (t) =>
  db.prepare(`PRAGMA table_info("${t}")`).all().map((c) => c.name)
console.log('Order columns:', cols('Order').join(', '))
console.log('Inventory columns:', cols('Inventory').join(', '))

console.log('\nServiceArea:', db.prepare('SELECT pincode, city FROM ServiceArea').all())
console.log('Pharmacy:', db.prepare('SELECT id, name, pincode, isActive FROM Pharmacy').all())
console.log('Medicines:', db.prepare('SELECT COUNT(*) c FROM Medicine').get().c)
console.log('Inventory rows:', db.prepare('SELECT COUNT(*) c FROM Inventory').get().c)
console.log('Rx medicines:', db.prepare('SELECT COUNT(*) c FROM Medicine WHERE requiresPrescription=1').get().c)

db.close()
