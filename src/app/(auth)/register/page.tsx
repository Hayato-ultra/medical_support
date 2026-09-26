'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/ui/auth-form'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [role, setRole] = useState('customer')

  const handleSubmit = async (email: string, password: string, name: string) => {
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Registration failed')
      }

      router.push('/login')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Medical Support</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <div className="flex gap-2 justify-center">
          {['customer', 'pharmacy', 'rider'].map((r) => (
            <Button
              key={r}
              variant={role === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRole(r)}
              className="capitalize"
            >
              {r}
            </Button>
          ))}
        </div>

        <AuthForm type="register" onSubmit={handleSubmit} error={error} />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="text-primary underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  )
}
