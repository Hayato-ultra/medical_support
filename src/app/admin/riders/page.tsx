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
import { Loader2, User, Truck, MapPin, CheckCircle, XCircle, Plus, Edit, Search, Filter } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300',
  available: 'bg-blue-100 text-blue-800 border-blue-300',
  busy: 'bg-amber-100 text-amber-800 border-amber-300',
  offline: 'bg-gray-100 text-gray-800 border-gray-300',
}

export default function RidersPage() {
  const { isLoading: authLoading } = useAuth()
  const [riders, setRiders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive' | 'available' | 'busy' | 'offline'>('ALL')
  const [selectedRider, setSelectedRider] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    phone: '',
    vehicleType: 'BIKE',
    licensePlate: '',
    isAvailable: true,
  })
  const [submitting, setSubmitting] = useState(false)

  async function fetchRiders() {
    try {
      setLoading(true)
      const supabase = createClient()
      let query = supabase.from('riders').select('*')
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'active') query = query.eq('is_available', true)
        else if (statusFilter === 'inactive') query = query.eq('is_available', false)
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setRiders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load riders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRiders()
  }, [statusFilter])

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const supabase = createClient()
      const data = editing ? { ...formData, updated_at: new Date().toISOString() } : formData
      const query = editing
        ? supabase.from('riders').update(data).eq('id', formData.id)
        : supabase.from('riders').insert(data)
      const { error } = await query
      if (error) throw error
      setShowForm(false)
      setEditing(false)
      setFormData({ id: '', name: '', phone: '', vehicleType: 'BIKE', licensePlate: '', isAvailable: true })
      fetchRiders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rider')
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(rider: any) {
    setEditing(true)
    setFormData({ ...rider })
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this rider?')) return
    const supabase = createClient()
    supabase.from('riders').delete().eq('id', id).then(({ error }) => {
      if (error) setError(error.message)
      else fetchRiders()
    })
  }

  function handleNew() {
    setEditing(false)
    setFormData({ id: '', name: '', phone: '', vehicleType: 'BIKE', licensePlate: '', isAvailable: true })
    setShowForm(true)
  }

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  const VEHICLE_TYPES = ['BIKE', 'SCOOTER', 'CAR', 'CYCLE']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riders</h1>
          <p className="text-muted-foreground">Manage delivery riders and their availability.</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rider
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
            placeholder="Search rider name, phone..."
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
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
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
                    <th className="px-4 py-3 text-left font-medium">Rider</th>
                    <th className="px-4 py-3 text-left font-medium">Phone</th>
                    <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                    <th className="px-4 py-3 text-left font-medium">License Plate</th>
                    <th className="px-4 py-3 text-left font-medium">Availability</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {riders
                    .filter((r) => {
                      if (statusFilter !== 'ALL') {
                        if (statusFilter === 'active' && !r.is_available) return false
                        if (statusFilter === 'inactive' && r.is_available) return false
                        if (statusFilter === 'available' && !r.is_available) return false
                        if (statusFilter === 'busy' && r.is_available) return false
                        if (statusFilter === 'offline' && r.is_available) return false
                      }
                      if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
                          !r.phone.toLowerCase().includes(searchQuery.toLowerCase()) &&
                          !r.license_plate.toLowerCase().includes(searchQuery.toLowerCase())) return false
                      return true
                    })
                    .map((rider: any) => (
                      <tr key={rider.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <p className="font-medium">{rider.name}</p>
                          <p className="text-xs text-muted-foreground">{rider.vehicle_type}</p>
                        </td>
                        <td className="px-4 py-4">{rider.phone}</td>
                        <td className="px-4 py-4">{rider.vehicle_type}</td>
                        <td className="px-4 py-4 font-mono text-sm">{rider.license_plate}</td>
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={rider.is_available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {rider.is_available ? 'Available' : 'Offline'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(rider)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(rider.id)}>
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