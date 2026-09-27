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
import { Loader2, Store, MapPin, CheckCircle, XCircle, Plus, Edit, Search, Filter } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
}

export default function PharmaciesPage() {
  const { isLoading: authLoading } = useAuth()
  const [pharmacies, setPharmacies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive' | 'pending'>('ALL')
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    licenseNumber: '',
    address: '',
    pincode: '',
    latitude: '',
    longitude: '',
    operatingHours: '',
    isActive: true,
  })
  const [submitting, setSubmitting] = useState(false)

  async function fetchPharmacies() {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase.from('pharmacies').select('*')
      if (statusFilter !== 'ALL') {
        query = query.eq('is_active', statusFilter === 'active')
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setPharmacies(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pharmacies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPharmacies()
  }, [statusFilter])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const supabase = createClient()
      const data = editing ? { ...formData, updated_at: new Date().toISOString() } : formData
      const query = editing
        ? supabase.from('pharmacies').update(data).eq('id', formData.id)
        : supabase.from('pharmacies').insert(data)
      const { error } = await query
      if (error) throw error
      setShowForm(false)
      setEditing(false)
      setFormData({ id: '', name: '', licenseNumber: '', address: '', pincode: '', latitude: '', longitude: '', operatingHours: '', isActive: true })
      fetchPharmacies()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pharmacy')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(pharmacy: any) {
    setEditing(true)
    setFormData({ ...pharmacy })
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this pharmacy?')) return
    const supabase = createClient()
    supabase.from('pharmacies').delete().eq('id', id).then(({ error }) => {
      if (error) setError(error.message)
      else fetchPharmacies()
    })
  }

  function handleNew() {
    setEditing(false)
    setFormData({ id: '', name: '', licenseNumber: '', address: '', pincode: '', latitude: '', longitude: '', operatingHours: '', isActive: true })
    setShowForm(true)
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pharmacies</h1>
          <p className="text-muted-foreground">Manage pharmacy partners and their licenses.</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pharmacy
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pharmacy name, license..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
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
                    <th className="px-4 py-3 text-left font-medium">Pharmacy</th>
                    <th className="px-4 py-3 text-left font-medium">License</th>
                    <th className="px-4 py-3 text-left font-medium">Address</th>
                    <th className="px-4 py-3 text-left font-medium">Pincode</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pharmacies
                    .filter((p) => {
                      if (statusFilter !== 'ALL') {
                        if (statusFilter === 'active' && !p.is_active) return false
                        if (statusFilter === 'inactive' && p.is_active) return false
                      }
                      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                          !p.license_number.toLowerCase().includes(searchQuery.toLowerCase())) return false
                      return true
                    })
                    .map((pharmacy: any) => (
                      <tr key={pharmacy.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <p className="font-medium">{pharmacy.name}</p>
                          <p className="text-xs text-muted-foreground">{pharmacy.operating_hours || 'Hours not set'}</p>
                        </td>
                        <td className="px-4 py-4 font-mono text-sm">{pharmacy.license_number}</td>
                        <td className="px-4 py-4 max-w-xs truncate">{pharmacy.address}</td>
                        <td className="px-4 py-4">{pharmacy.pincode}</td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={pharmacy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {pharmacy.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(pharmacy)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(pharmacy.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}