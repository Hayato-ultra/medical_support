'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { AuthForm } from '@/components/ui/auth-form'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'otp'>('login')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')

  const handleLogin = async (email: string, password: string) => {
    setError('')
    try {
      const result = await signIn('credentials', {
        identifier: email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/medicines')
        router.refresh()
      }
    } catch (err) {
      setError('Login failed')
    }
  }

  const handleSendOtp = async () => {
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
        setMode('otp')
      }
    } catch (err) {
      setError('Failed to send OTP')
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    try {
      const result = await signIn('credentials', {
        identifier: phone,
        otp,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid OTP')
      } else {
        router.push('/medicines')
        router.refresh()
      }
    } catch (err) {
      setError('OTP verification failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Medical Support</h1>
          <p className="text-muted-foreground">
            {mode === 'login' ? 'Sign in to your account' : 'Enter the OTP sent to your phone'}
          </p>
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant={mode === 'login' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('login')}
          >
            Sign In
          </Button>
          <Button
            variant={mode === 'otp' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('otp')}
          >
            Phone OTP
          </Button>
        </div>

        {mode === 'login' ? (
          <AuthForm type="login" onSubmit={handleLogin} error={error} />
        ) : (
          <div className="space-y-4">
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
            {!phone ? (
              <Button className="w-full" onClick={handleSendOtp}>
                Send OTP
              </Button>
            ) : (
              <div className="space-y-3">
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
                <Button className="w-full" onClick={handleVerifyOtp}>
                  Verify & Sign In
                </Button>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setPhone(''); setMode('otp') }}>
                  Resend OTP
                </Button>
              </div>
            )}
          </div>
        )}

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
