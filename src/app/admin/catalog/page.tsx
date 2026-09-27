'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/browser-client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Box, Pill, Plus, Edit, Search, Filter, XCircle } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300',
}

export default function CatalogPage() {
  const { isLoading: authLoading } = useAuth()
  const [medicines, setMedicines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'active' | 'inactive'>('ALL')
  const [rxFilter, setRxFilter] = useState<'ALL' | 'rx' | 'otc'>('ALL')
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    manufacturer: '',
    dosageForm: 'Tablet',
    strength: '',
    requiresPrescription: false,
    category: '',
    description: '',
    imageUrl: '',
  })
  const [submitting, setSubmitting] = useState(false)

  async function fetchMedicines() {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase.from('medicines').select('*')
      if (categoryFilter !== 'ALL') {
        query = query.eq('is_active', categoryFilter === 'active')
      }
      if (rxFilter !== 'ALL') {
        query = query.eq('requires_prescription', rxFilter === 'rx')
      }
      const { data, error } = await query.order('name', { ascending: true })
      if (error) throw error
      setMedicines(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medicines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMedicines()
  }, [categoryFilter, rxFilter])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const supabase = createClient()
      const data = editing ? { ...formData, updated_at: new Date().toISOString() } : formData
      const query = editing
        ? supabase.from('medicines').update(data).eq('id', formData.id)
        : supabase.from('medicines').insert(data)
      const { error } = await query
      if (error) throw error
      setShowForm(false)
      setEditing(false)
      setFormData({ id: '', name: '', manufacturer: '', dosageForm: 'Tablet', strength: '', requiresPrescription: false, category: '', description: '', imageUrl: '' })
      fetchMedicines()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save medicine')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(medicine: any) {
    setEditing(true)
    setFormData({ ...medicine })
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this medicine?')) return
    const supabase = createClient()
    supabase.from('medicines').delete().eq('id', id).then(({ error }) => {
      if (error) setError(error.message)
      else fetchMedicines()
    })
  }

  function handleNew() {
    setEditing(false)
    setFormData({ id: '', name: '', manufacturer: '', dosageForm: 'Tablet', strength: '', requiresPrescription: false, category: '', description: '', imageUrl: '' })
    setShowForm(true)
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const filteredMedicines = medicines.filter((m) => {
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const medicineRows = filteredMedicines.map((medicine: any) => (
    <tr key={medicine.id} className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-4">
        <p className="font-medium">{medicine.name}</p>
        <p className="text-xs text-muted-foreground">{medicine.description?.slice(0, 50)}...</p>
      </td>
      <td className="px-4 py-4">{medicine.manufacturer}</td>
      <td className="px-4 py-4">{medicine.dosage_form} / {medicine.strength}</td>
      <td className="px-4 py-4">{medicine.category}</td>
      <td className="px-4 py-4">
        <Badge variant="outline" className={medicine.requires_prescription ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
          {medicine.requires_prescription ? 'Rx' : 'OTC'}
        </Badge>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(medicine)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(medicine.id)}>
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  ))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catalog</h1>
          <p className="text-muted-foreground">Manage medicine catalog and inventory.</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search medicine name, manufacturer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={rxFilter} onValueChange={(v) => setRxFilter(v as typeof rxFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Prescription Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="rx">Prescription (Rx)</SelectItem>
            <SelectItem value="otc">Over-the-counter (OTC)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Medicine</th>
                    <th className="px-4 py-3 text-left font-medium">Manufacturer</th>
                    <th className="px-4 py-3 text-left font-medium">Form/Strength</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicineRows}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}