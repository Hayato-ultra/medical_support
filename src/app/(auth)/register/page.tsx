'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthForm } from '@/components/ui/auth-form'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [role, setRole] = useState('customer')
  const [mode, setMode] = useState<'form' | 'phone'>('form')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [name, setName] = useState('')

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

  const handleSendPhoneOtp = async () => {
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setOtpSent(true)
      }
    } catch (err) {
      setError('Failed to send OTP')
    }
  }

  const handlePhoneRegister = async () => {
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `${phone}@medical.com`,
          password: 'temp-' + Date.now(),
          name: name || 'User',
          phone,
          role,
          otp,
        }),
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

        <div className="flex gap-2 justify-center">
          <Button
            variant={mode === 'form' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('form')}
          >
            Email Sign Up
          </Button>
          <Button
            variant={mode === 'phone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('phone')}
          >
            Phone Sign Up
          </Button>
        </div>

        {mode === 'form' ? (
          <AuthForm type="register" onSubmit={handleSubmit} error={error} />
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>
            {otpSent ? (
              <>
                <div>
                  <label className="text-sm font-medium">OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-center text-xl tracking-widest"
                  />
                </div>
                <Button className="w-full" onClick={handlePhoneRegister}>
                  Complete Registration
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setOtpSent(false); setOtp('') }}>
                  Resend OTP
                </Button>
              </>
            ) : (
              <Button className="w-full" onClick={handleSendPhoneOtp}>
                Send OTP and Register
              </Button>
            )}
          </div>
        )}

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