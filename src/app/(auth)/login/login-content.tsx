'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { homeForRole } from '@/lib/role-home'

export function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const otpInputRef = useRef<HTMLInputElement | null>(null)

  const [error, setError] = useState('')
  const [mode, setMode] = useState<'password' | 'emailOtp'>('password')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [registered, setRegistered] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    const role = searchParams.get('registered')
    if (role) setRegistered(role)
  }, [searchParams])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(c => c - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const goHome = async (role: string) => {
    router.push(homeForRole(role))
    router.refresh()
  }

  const handleLogin = async (email: string, password: string) => {
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError('Invalid email or password')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
          await goHome(profile?.role || 'CUSTOMER')
        }
      }
    } catch (err) {
      setError('Login failed')
    }
  }

  const handleSendOtp = async () => {
    setError('')
    setBusy(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
      })

      if (error) {
        setError(error.message)
      } else {
        setOtpSent(true)
        setResendCooldown(60) // 60 second cooldown
        setTimeout(() => otpInputRef.current?.focus(), 0)
      }
    } catch (err) {
      setError('Failed to send OTP')
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      })

      if (error) {
        setError('Invalid OTP')
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
          await goHome(profile?.role || 'CUSTOMER')
        }
      }
    } catch (err) {
      setError('OTP verification failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Mediconnect</CardTitle>
          <CardDescription>
            {mode === 'password' ? 'Sign in with email and password' : 'Enter your email to receive OTP'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {registered && (
            <div className="rounded border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
              Account created. {registered === 'pharmacy_owner'
                ? 'Your pharmacy stays inactive until an admin approves your licence, so you will not see orders until then.'
                : 'Sign in below to continue.'}
            </div>
          )}

          <div className="flex gap-2 justify-center">
            <Button
              variant={mode === 'password' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('password')}
            >
              Password
            </Button>
            <Button
              variant={mode === 'emailOtp' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('emailOtp')}
            >
              Email OTP
            </Button>
          </div>

          {mode === 'password' ? (
            <EmailLoginForm onSubmit={handleLogin} error={error} />
          ) : (
            <EmailOtpForm
              email={email}
              setEmail={setEmail}
              otp={otp}
              setOtp={setOtp}
              otpSent={otpSent}
              busy={busy}
              resendCooldown={resendCooldown}
              otpInputRef={otpInputRef}
              onSendOtp={handleSendOtp}
              onVerifyOtp={handleVerifyOtp}
              onResendOtp={() => {
                setOtpSent(false)
                setOtp('')
              }}
              error={error}
            />
          )}

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary underline">
              Register
            </Link>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Customers, pharmacies and riders all sign in here. You will be taken
            straight to the dashboard for your role.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EmailLoginForm({ onSubmit, error }: { onSubmit: (email: string, password: string) => Promise<void>; error: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit(email, password)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={loading}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  )
}

function EmailOtpForm({
  email,
  setEmail,
  otp,
  setOtp,
  otpSent,
  busy,
  resendCooldown,
  otpInputRef,
  onSendOtp,
  onVerifyOtp,
  onResendOtp,
  error,
}: {
  email: string
  setEmail: (email: string) => void
  otp: string
  setOtp: (otp: string) => void
  otpSent: boolean
  busy: boolean
  resendCooldown: number
  otpInputRef: React.RefObject<HTMLInputElement | null>
  onSendOtp: () => void
  onVerifyOtp: () => void
  onResendOtp: () => void
  error: string
}) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {!otpSent ? (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            required
          />
          <Button className="w-full" onClick={onSendOtp} disabled={busy || !email}>
            Send OTP
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="otp">OTP</Label>
            <Input
              ref={otpInputRef}
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="text-center text-xl tracking-widest"
              disabled={busy}
            />
          </div>
          <Button className="w-full" onClick={onVerifyOtp} disabled={busy || otp.length !== 6}>
            Verify & Sign In
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onResendOtp}
            disabled={busy || resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
          </Button>
        </div>
      )}
    </div>
  )
}