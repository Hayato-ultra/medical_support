import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

const db = new DatabaseSync(process.env.DATABASE_URL ?? './medical_support.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS ServiceArea (
    id        TEXT PRIMARY KEY,
    pincode   TEXT NOT NULL UNIQUE,
    city      TEXT,
    region    TEXT,
    isActive  INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS WaitlistEntry (
    id        TEXT PRIMARY KEY,
    pincode   TEXT NOT NULL,
    phone     TEXT NOT NULL,
    notified  INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (pincode, phone)
  );
`)

// Pincodes covered by the seed pharmacy, so the checkout gate is DB-backed.
const COVERAGE = [
  { pincode: '452001', city: 'Indore', region: 'Madhya Pradesh' },
  { pincode: '452002', city: 'Indore', region: 'Madhya Pradesh' },
  { pincode: '452003', city: 'Indore', region: 'Madhya Pradesh' },
  { pincode: '452010', city: 'Indore', region: 'Madhya Pradesh' },
]

const upsert = db.prepare(
  `INSERT INTO ServiceArea (id, pincode, city, region, isActive, createdAt)
   VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
   ON CONFLICT(pincode) DO UPDATE SET city = excluded.city, region = excluded.region`
)

for (const row of COVERAGE) {
  upsert.run(randomUUID(), row.pincode, row.city, row.region)
}

const total = db.prepare('SELECT COUNT(*) AS c FROM ServiceArea').get().c
console.log(`ServiceArea ready — ${total} pincodes`)
db.close()
