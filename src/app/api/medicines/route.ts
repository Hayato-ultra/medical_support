import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db/client'

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function trigrams(value: string) {
  const padded = `  ${value} `
  const out: string[] = []
  for (let i = 0; i < padded.length - 2; i++) out.push(padded.slice(i, i + 3))
  return out
}

function similarity(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.9

  const ta = trigrams(a)
  const tb = new Set(trigrams(b))
  if (!ta.length || !tb.size) return 0

  let shared = 0
  for (const t of ta) if (tb.has(t)) shared++

  return (2 * shared) / (ta.length + tb.size)
}

/** Fuzzy score for one search token. Short tokens are too noisy to match. */
function tokenScore(needle: string, token: string) {
  if (token.length < 3) return 0
  if (token === needle) return 1
  // Prefix matches cover the common cases: "para" -> paracetamol, and a query
  // that is more specific than the product word ("iodine" vs "povidone iodine").
  if (token.startsWith(needle) || needle.startsWith(token)) return 0.95
  return similarity(needle, token)
}

/**
 * Scores a medicine against the query.
 *
 * Compares word by word instead of against the whole flattened label, which
 * otherwise let unrelated products through on incidental trigrams (an "iodine"
 * search matched "Amlodipine").
 */
function scoreMedicine(needle: string, medicine: any) {
  const nameNorm = normalize(medicine.name)
  if (nameNorm.includes(needle) || needle.includes(nameNorm)) return 1

  const tokens = medicine.name
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean)

  let best = 0
  for (const token of tokens) {
    const score = tokenScore(needle, token)
    if (score > best) best = score
  }
  return best
}

/**
 * Extracts the generic (salt) name from a medicine label.
 *
 * Handles the "Brand - Generic" form used by the catalog, plus a plain
 * "Paracetamol 500mg" query. The salt is the FIRST word of the generic rather
 * than the last word before the strength, so multi-word generics resolve to the
 * substance instead of its salt form ("Losartan Potassium 50mg" -> losartan).
 */
function extractSalt(name: string): string | null {
  const genericPart = name.includes(' - ') ? name.split(' - ').slice(1).join(' - ') : name
  const leading = genericPart.trim().match(/^([A-Za-z][A-Za-z0-9]*)/)
  if (leading) return normalize(leading[1])
  const anywhere = genericPart.match(/([A-Za-z][A-Za-z0-9]*)/)
  return anywhere ? normalize(anywhere[1]) : null
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')?.trim() || ''
    const category = searchParams.get('category') || ''
    const requiresPrescription = searchParams.get('requiresPrescription')
    const pincode = searchParams.get('pincode') || ''

    const medicines = (await db.orm.Medicine.where({}).all()) as any[]
    const inventory = (await db.orm.Inventory.where({}).all()) as any[]

    const pharmacies = pincode
      ? ((await db.orm.Pharmacy.where({ pincode }).all()) as any[])
      : ((await db.orm.Pharmacy.where({}).all()) as any[])
    const pharmacyIds = new Set(pharmacies.map((p) => p.id))

    const stockByMedicine = new Map<string, { total: number; minPrice: number }>()
    for (const row of inventory) {
      if (pharmacyIds.size && !pharmacyIds.has(row.pharmacyId)) continue
      const entry = stockByMedicine.get(row.medicineId) || {
        total: 0,
        minPrice: Number.MAX_SAFE_INTEGER,
      }
      entry.total += row.quantity
      entry.minPrice = Math.min(entry.minPrice, Number(row.price))
      stockByMedicine.set(row.medicineId, entry)
    }

    let enriched = medicines.map((m) => {
      const stock = stockByMedicine.get(m.id)
      return {
        id: m.id,
        name: m.name,
        manufacturer: m.manufacturer,
        dosageForm: m.dosageForm,
        strength: m.strength,
        requiresPrescription: !!m.requiresPrescription,
        category: m.category,
        description: m.description || '',
        imageUrl: m.imageUrl || null,
        price: stock && stock.minPrice !== Number.MAX_SAFE_INTEGER
          ? Math.round(stock.minPrice * 100) / 100
          : null,
        inStock: !!stock && stock.total > 0,
        stockAvailable: stock ? stock.total : 0,
      }
    })

    if (category && category.toLowerCase() !== 'all') {
      enriched = enriched.filter(
        (m) => m.category.toLowerCase() === category.toLowerCase()
      )
    }

    if (requiresPrescription === '1') {
      enriched = enriched.filter((m) => m.requiresPrescription)
    }

    let alternatives: Record<string, any[]> = {}

    if (query) {
      const needle = normalize(query)

      const scored = enriched
        .map((m) => ({ medicine: m, score: scoreMedicine(needle, m) }))
        .filter((entry) => entry.score > 0.45)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.medicine)

      const querySalt = extractSalt(query)

      for (const medicine of scored) {
        if (medicine.inStock || !querySalt) continue
        const salt = extractSalt(medicine.name)
        // A missing salt would group unrelated products together.
        if (!salt || salt !== querySalt) continue
        const match = enriched.find(
          (m) => m.id !== medicine.id && m.inStock && extractSalt(m.name) === salt
        )
        if (match) {
          alternatives[medicine.id] = [
            {
              id: match.id,
              name: match.name,
              strength: match.strength,
              price: match.price,
              manufacturer: match.manufacturer,
            },
          ]
        }
      }

      enriched = scored
    }

    return NextResponse.json({
      medicines: enriched,
      count: enriched.length,
      alternatives,
    })
  } catch (error) {
    console.error('Medicine search error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch medicines' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.name || !body.manufacturer || !body.category) {
      return NextResponse.json(
        { error: 'name, manufacturer and category are required' },
        { status: 400 }
      )
    }

    const medicine = await db.orm.Medicine.create({
      id: randomUUID(),
      name: body.name,
      manufacturer: body.manufacturer,
      dosageForm: body.dosageForm || 'Tablet',
      strength: body.strength || '',
      requiresPrescription: body.requiresPrescription ? 1 : 0,
      category: body.category,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
    } as any)

    return NextResponse.json({ medicine }, { status: 201 })
  } catch (error) {
    console.error('Create medicine error:', error)
    return NextResponse.json(
      { error: 'Failed to create medicine' },
      { status: 500 }
    )
  }
}
