import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('medical_support.db')

const existing = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all()
  .map((r) => r.name)

const statements = [
  `CREATE TABLE IF NOT EXISTS OtpToken (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    otp TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS OtpToken_phone_expiresAt_key ON OtpToken (phone, expiresAt)`,
  `CREATE TABLE IF NOT EXISTS PrescriptionLibrary (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    prescriptionId TEXT NOT NULL,
    imageUrl TEXT NOT NULL,
    doctorName TEXT,
    expiryDate DATETIME,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES Customer (id)
  )`,
]

for (const sql of statements) {
  db.exec(sql)
}

const after = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((r) => r.name)

console.log('before:', existing.join(', '))
console.log('after :', after.join(', '))
db.close()
