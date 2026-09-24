'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  // Redirect authenticated users to their role-specific dashboard
  if (isAuthenticated && user?.role) {
    const role = user.role.toLowerCase()
    return (
      <div className="min-h-screen">
        <RedirectToDashboard role={role} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Medical Support</h1>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-600">Welcome, {user?.email}</span>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-blue-600 hover:text-blue-800">
                  Sign In
                </Link>
                <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Medicine Delivery Platform</h2>
          <p className="text-xl text-gray-600 mb-8">
            Order medicines from nearby pharmacies with prescription verification
          </p>
          
          {!isAuthenticated ? (
            <div className="space-y-4">
              <Link
                href="/register"
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-4"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="inline-block px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="space-y-4 hidden">
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function RedirectToDashboard({ role }: { role: string }) {
  const redirects: Record<string, string> = {
    customer: '/customer',
    pharmacy_owner: '/pharmacy',
    pharmacy_staff: '/pharmacy',
    rider: '/rider',
    admin: '/admin',
  }
  const dest = redirects[role] || '/login'
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg text-gray-600">Redirecting to {dest}...</p>
    </div>
  )
}