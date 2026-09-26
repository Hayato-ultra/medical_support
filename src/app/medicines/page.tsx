'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/components/customer/cart-provider'
import { MedicineSearch } from '@/components/customer/medicine-search'
import { MedicineCard } from '@/components/customer/medicine-card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function MedicinesPage() {
  const { itemCount } = useCart()
  const [medicines, setMedicines] = useState<any[]>([])
  const [filteredMedicines, setFilteredMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/medicines')
      .then((res) => res.json())
      .then((data) => {
        const meds = data.medicines || []
        setMedicines(meds)
        setFilteredMedicines(meds)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Medicine Catalog</h1>
            <p className="text-muted-foreground">Browse medicines and add them to your cart</p>
          </div>
          {itemCount > 0 && (
            <Link href="/cart">
              <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
                <ShoppingCart className="h-4 w-4 mr-1" /> {itemCount} in cart
              </Badge>
            </Link>
          )}
        </div>

        {itemCount > 0 && (
          <div className="mb-4">
            <Link href="/cart">
              <Button variant="outline" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" /> View Cart ({itemCount})
              </Button>
            </Link>
          </div>
        )}

        <MedicineSearch medicines={medicines} setFilteredMedicines={setFilteredMedicines} />

        {filteredMedicines.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-4">No medicines found matching your search</p>
            <Link href="/medicines">
              <Button>Clear Filters</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {filteredMedicines.map((medicine: any) => (
              <MedicineCard key={medicine.id} medicine={medicine} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}