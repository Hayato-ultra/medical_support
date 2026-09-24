'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useState } from 'react'

export default function PharmacyDashboard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  const [view, setView] = useState<'orders' | 'prescriptions' | 'profile'>('orders')

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white shadow-sm border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-foreground">
              Pharmacy Dashboard
            </h1>
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('orders')}
              className={`px-3 py-1 rounded text-sm ${view === 'orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Orders
            </button>
            <button
              onClick={() => setView('prescriptions')}
              className={`px-3 py-1 rounded text-sm ${view === 'prescriptions' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setView('profile')}
              className={`px-3 py-1 rounded text-sm ${view === 'profile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Profile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {view === 'orders' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Orders Overview</h2>
            <p className="text-muted-foreground">
              View and manage customer orders pending prescription verification
            </p>
            {/* Orders table would go here */}
          </div>
        )}

        {view === 'prescriptions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Prescription Management</h2>
            <p className="text-muted-foreground">
              Upload and verify prescription documents
            </p>
            {/* Prescription management UI would go here */}
          </div>
        )}

        {view === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Pharmacy Profile</h2>
            <p className="text-muted-foreground">
              Manage pharmacy details and settings
            </p>
            {/* Pharmacy profile UI would go here */}
          </div>
        )}
      </main>
    </div>
  )
}