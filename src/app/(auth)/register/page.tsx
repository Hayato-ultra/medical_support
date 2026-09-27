'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const VEHICLE_TYPES = ['BIKE', 'SCOOTER', 'CAR', 'CYCLE']

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [role, setRole] = useState<'customer' | 'pharmacy' | 'rider'>('customer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [pharmacyName, setPharmacyName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [pharmacyAddress, setPharmacyAddress] = useState('')
  const [pharmacyPincode, setPharmacyPincode] = useState('')
  const [vehicleType, setVehicleType] = useState('BIKE')
  const [licensePlate, setLicensePlate] = useState('')

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown(c => c - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

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
        setResendCooldown(60)
      }
    } catch {
      setError('Failed to send OTP')
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async () => {
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!email) {
      setError('Email is required')
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()

      // Verify OTP first
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      })

      if (verifyError || !verifyData.user) {
        throw new Error(verifyError?.message || 'Invalid OTP')
      }

      const userId = verifyData.user.id

      // Create user profile
      const profileData: any = {
        id: userId,
        email: email,
        role: role.toUpperCase() as 'CUSTOMER' | 'PHARMACY_OWNER' | 'PHARMACY_STAFF' | 'RIDER',
        password_hash: '', // Supabase handles password
      }

      const { error: profileError } = await supabase.from('users').upsert(profileData)
      if (profileError) throw profileError

      // Create role-specific records
      if (role === 'customer') {
        const { error: customerError } = await supabase.from('customers').insert({
          user_id: userId,
          name,
          phone: '', // phone is optional now
        })
        if (customerError) throw customerError
      } else if (role === 'pharmacy') {
        const { data: pharmacy, error: pharmacyError } = await supabase.from('pharmacies').insert({
          name: pharmacyName,
          license_number: licenseNumber,
          address: pharmacyAddress,
          pincode: pharmacyPincode,
          latitude: 0,
          longitude: 0,
          is_active: false, // Requires admin approval
        }).select().single()
        if (pharmacyError) throw pharmacyError

        await supabase.from('pharmacy_staff').insert({
          user_id: userId,
          pharmacy_id: pharmacy.id,
          role: 'OWNER',
        })
      } else if (role === 'rider') {
        await supabase.from('riders').insert({
          user_id: userId,
          name,
          phone: '', // phone is optional now
          vehicle_type: vehicleType,
          license_plate: licensePlate,
        })
      }

      router.push(`/login?registered=${role}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Medical Support</CardTitle>
          <CardDescription>Create your account</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2 justify-center">
            {['customer', 'pharmacy', 'rider'].map((r) => (
              <Button
                key={r}
                variant={role === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRole(r as 'customer' | 'pharmacy' | 'rider')}
                className="capitalize"
              >
                {r}
              </Button>
            ))}
          </div>

          {error && (
            <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={busy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy || otpSent}
              />
            </div>

            {role === 'pharmacy' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="pharmacyName">Pharmacy name</Label>
                  <Input
                    id="pharmacyName"
                    placeholder="As printed on the licence"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">Drug licence number</Label>
                  <Input
                    id="licenseNumber"
                    placeholder="e.g. 23B/1234/2024"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pharmacyAddress">Registered address</Label>
                  <Input
                    id="pharmacyAddress"
                    placeholder="Shop no, street, area"
                    value={pharmacyAddress}
                    onChange={(e) => setPharmacyAddress(e.target.value)}
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pharmacyPincode">Pincode</Label>
                  <Input
                    id="pharmacyPincode"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="452001"
                    value={pharmacyPincode}
                    onChange={(e) => setPharmacyPincode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={busy}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your pharmacy stays inactive until an admin approves the licence.
                  You can create the account now and wait for approval.
                </p>
              </>
            )}

            {role === 'rider' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle type</Label>
                  <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as typeof vehicleType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v.charAt(0) + v.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">Vehicle registration number</Label>
                  <Input
                    id="licensePlate"
                    placeholder="MP 09 AB 1234"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    required
                    disabled={busy}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={busy}
              />
              <p className="text-xs text-muted-foreground">You will use this to sign in. It must be at least 8 characters.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={busy}
              />
            </div>

            {!otpSent ? (
              <Button
                className="w-full"
                onClick={handleSendOtp}
                disabled={busy || !email}
              >
                Send OTP to my email
              </Button>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-xl tracking-widest"
                    required
                    disabled={busy}
                  />
                </div>
                <Button className="w-full" onClick={handleRegister} disabled={busy || otp.length !== 6}>
                  {busy ? 'Creating account...' : 'Create account'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                  }}
                  disabled={busy || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
                </Button>
              </>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary underline">
              Sign In
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            By creating an account you accept our{' '}
            <Link href="/terms" className="underline">terms of service</Link> and{' '}
            <Link href="/privacy" className="underline">privacy policy</Link>.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}