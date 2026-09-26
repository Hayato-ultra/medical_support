'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, Pill } from 'lucide-react'
import { useCart } from '@/components/customer/cart-provider'
import Link from 'next/link'

interface MedicineCardProps {
  medicine: {
    id: string
    name: string
    manufacturer: string
    dosageForm: string
    strength: string
    requiresPrescription?: number
    category: string
    description?: string
    price?: number
  }
}

export function MedicineCard({ medicine }: MedicineCardProps) {
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart({
      medicineId: medicine.id,
      name: medicine.name,
      price: medicine.price || 0,
      quantity: 1,
      requiresPrescription: !!medicine.requiresPrescription,
    })
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{medicine.name}</CardTitle>
            <CardDescription>{medicine.manufacturer} • {medicine.dosageForm}</CardDescription>
          </div>
          {medicine.requiresPrescription && (
            <Badge variant="secondary">
              <Pill className="mr-1 h-3 w-3" /> Rx
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">{medicine.strength}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold">₹{medicine.price || 'N/A'}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddToCart}>
              <ShoppingCart className="mr-1 h-4 w-4" /> Add
            </Button>
            <Link href={`/medicines/${medicine.id}`}>
              <Button variant="outline" size="sm">View</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}