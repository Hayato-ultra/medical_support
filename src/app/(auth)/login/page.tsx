'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/ui/auth-form'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [role, setRole] = useState('customer')

  const handleSubmit = async (email: string, password: string) => {
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      const roleMap: Record<string, string> = {
        customer: '/dashboard?role=customer',
        pharmacy: '/pharmacy',
        rider: '/rider',
        admin: '/dashboard?role=admin',
      }
      router.push(roleMap[role] || '/dashboard?role=customer')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Medical Support</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
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

        <AuthForm type="login" onSubmit={handleSubmit} error={error} />

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a href="/register" className="text-primary underline">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}
