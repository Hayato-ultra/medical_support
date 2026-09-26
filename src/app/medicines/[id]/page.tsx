'use client'

import { useParams } from 'next/navigation'
import { useMedicine } from '@/hooks/useMedicines'
import { MedicineCard } from '@/components/customer/medicine-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'

export default function MedicineDetailPage() {
  const params = useParams()
  const { medicine, loading } = useMedicine(params.id as string)

  if (loading || !medicine) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-muted rounded-lg h-64 flex items-center justify-center">
            <Package className="h-24 w-24 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{medicine.name}</h1>
            <p className="text-muted-foreground mb-4">{medicine.manufacturer}</p>
            <div className="space-y-2 mb-4">
              <p><strong>Dosage:</strong> {medicine.dosageForm}</p>
              <p><strong>Strength:</strong> {medicine.strength}</p>
              <p><strong>Category:</strong> {medicine.category}</p>
              {medicine.requiresPrescription && (
                <Badge variant="secondary">Prescription Required</Badge>
              )}
            </div>
            <p className="text-2xl font-bold">₹{medicine.price || 'N/A'}</p>
            <Button className="mt-4 w-full" size="lg">Add to Cart</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
