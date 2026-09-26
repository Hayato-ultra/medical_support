import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('medical_support.db')

const columns = db.prepare('PRAGMA table_info("Order")').all().map((c) => c.name)

const additions = [
  ['deliveryOtp', 'ALTER TABLE "Order" ADD COLUMN "deliveryOtp" TEXT'],
  ['otpVerifiedAt', 'ALTER TABLE "Order" ADD COLUMN "otpVerifiedAt" DATETIME'],
]

for (const [name, sql] of additions) {
  if (!columns.includes(name)) {
    db.exec(sql)
    console.log(`added column: ${name}`)
  } else {
    console.log(`column already present: ${name}`)
  }
}

console.log('Order columns:', db.prepare('PRAGMA table_info("Order")').all().map((c) => c.name).join(', '))
db.close()
