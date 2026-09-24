'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/ui/auth-form'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  const handleSubmit = async (email: string, password: string, name: string) => {
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Registration failed')
      }

      router.push('/login')
} catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <AuthForm
        type="register"
        onSubmit={handleSubmit}
        error={error}
      />
    </div>
  )
}