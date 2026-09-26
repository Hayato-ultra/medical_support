'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSession, signIn } from 'next-auth/react'
import { AuthForm } from '@/components/ui/auth-form'
import { Button } from '@/components/ui/button'
import { homeForRole } from '@/lib/role-home'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'otp'>('login')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [registered, setRegistered] = useState('')

  // Just landed here from /register?registered=pharmacy_owner. Read it in an
  // effect rather than with useSearchParams so this page stays prerenderable
  // without a Suspense boundary.
  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('registered')
    if (role) setRegistered(role)
  }, [])

  // One shared destination for both sign-in paths. The role is read back from
  // the session rather than assumed, so a pharmacy signing in through the
  // footer's "Pharmacy login" lands on the pharmacy dashboard instead of the
  // customer medicines page.
  const goHome = async () => {
    const session = await getSession()
    router.push(homeForRole(session?.user?.role || 'CUSTOMER'))
    router.refresh()
  }

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
        await goHome()
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
        await goHome()
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

        {registered && (
          <div className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
            Account created. {registered === 'pharmacy_owner'
              ? 'Your pharmacy stays inactive until an admin approves your licence, so you will not see orders until then.'
              : 'Sign in below to continue.'}
          </div>
        )}

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
          <AuthForm onSubmit={handleLogin} error={error} />
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
        <p className="text-center text-xs text-muted-foreground">
          Customers, pharmacies and riders all sign in here. You will be taken
          straight to the dashboard for your role.
        </p>
      </div>
    </div>
  )
}
