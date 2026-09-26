'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Package } from 'lucide-react'

const categories = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler']

interface MedicineSearchProps {
  medicines: any[]
  setFilteredMedicines: (meds: any[]) => void
}

export function MedicineSearch({ medicines, setFilteredMedicines }: MedicineSearchProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [rxOnly, setRxOnly] = useState(false)

  const filtered = useMemo(() => {
    return medicines.filter((m: any) => {
      const matchesQuery = !query || m.name.toLowerCase().includes(query.toLowerCase()) || m.description?.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category === 'All' || m.category.toLowerCase() === category.toLowerCase()
      const matchesRx = !rxOnly || Number(m.requiresPrescription) === 1
      return matchesQuery && matchesCategory && matchesRx
    })
  }, [medicines, query, category, rxOnly])

  useMemo(() => {
    setFilteredMedicines(filtered)
  }, [filtered, setFilteredMedicines])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicines by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setQuery(query)} disabled={!query}>
          <Search className="h-4 w-4 mr-2" /> Search
        </Button>
      </div>
      <div className="flex gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={rxOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRxOnly(!rxOnly)}
        >
          <Package className="mr-1 h-3 w-3" /> Rx Only
        </Button>
      </div>
      {query && (
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {medicines.length} medicines
        </p>
      )}
    </div>
  )
}