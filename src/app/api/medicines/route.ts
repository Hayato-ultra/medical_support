import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { z } from 'zod'

const MedicineSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  manufacturer: z.string(),
  dosageForm: z.string(),
  strength: z.string(),
  requiresPrescription: z.number().optional(),
  category: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
})

const SearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  requiresPrescription: z.number().optional(),
  pincode: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query') || ''
    const category = searchParams.get('category') || undefined
    const requiresPrescription = searchParams.get('requiresPrescription')
      ? Number(searchParams.get('requiresPrescription'))
      : undefined
    const pincode = searchParams.get('pincode') || undefined

    const medicines = await db.orm.Medicine
      .where({})
      .all()

    const filtered = medicines.filter((m: any) => {
      const matchesQuery = !query || m.name.toLowerCase().includes(query.toLowerCase()) || m.description?.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = !category || m.category.toLowerCase() === category.toLowerCase()
      const matchesRx = requiresPrescription === undefined || Number(m.requiresPrescription) === requiresPrescription
      return matchesQuery && matchesCategory && matchesRx
    })

    return NextResponse.json({ medicines: filtered, count: filtered.length })
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
    const data = MedicineSchema.parse(body)

    const medicine = await db.orm.Medicine.create({
      ...data,
      requiresPrescription: data.requiresPrescription || 0,
    })

    return NextResponse.json({ medicine }, { status: 201 })
  } catch (error) {
    console.error('Create medicine error:', error)
    return NextResponse.json(
      { error: 'Failed to create medicine' },
      { status: 500 }
    )
  }
}
