'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const VEHICLE_TYPES = ['BIKE', 'SCOOTER', 'CAR', 'CYCLE']

const FIELD =
  'w-full border rounded-lg px-3 py-2 mt-1 bg-background'

/**
 * One signup form for every role.
 *
 * The register API is the contract: it needs a phone, an OTP from that phone, a
 * password the person actually knows, and the role-specific onboarding data.
 * The previous two-mode form sent none of those, so every signup failed. The
 * pharmacy details matter most here — a pharmacy that registers without a
 * licence number is inactive, so the form asks for it up front.
 */
export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [role, setRole] = useState('customer')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const [pharmacyName, setPharmacyName] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [pharmacyAddress, setPharmacyAddress] = useState('')
  const [pharmacyPincode, setPharmacyPincode] = useState('')
  const [vehicleType, setVehicleType] = useState('BIKE')
  const [licensePlate, setLicensePlate] = useState('')

  const handleSendOtp = async () => {
    setError('')
    setBusy(true)
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
        if (data.devOtp) setOtp(data.devOtp)
      }
    } catch {
      setError('Failed to send OTP')
    } finally {
      setBusy(false)
    }
  }

  const handleRegister = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          otp,
          password,
          role,
          pharmacyName,
          licenseNumber,
          pharmacyAddress,
          pharmacyPincode,
          vehicleType,
          licensePlate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // A pharmacy cannot do anything until an admin verifies its licence, so
      // say that on the sign-in page instead of dropping them at a login form
      // with no context.
      router.push(`/login?registered=${data.role.toLowerCase()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-10">
      <div className="w-full max-w-md space-y-6 px-4">
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

        {error && (
          <div className="rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={FIELD}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Mobile number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="9876543210"
              className={FIELD}
            />
          </div>

          {role === 'pharmacy' && (
            <>
              <div>
                <label className="text-sm font-medium">Pharmacy name</label>
                <input
                  type="text"
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  placeholder="As printed on the licence"
                  className={FIELD}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Drug licence number</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. 23B/1234/2024"
                  className={FIELD}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Registered address</label>
                <input
                  type="text"
                  value={pharmacyAddress}
                  onChange={(e) => setPharmacyAddress(e.target.value)}
                  placeholder="Shop no, street, area"
                  className={FIELD}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Pincode</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pharmacyPincode}
                  onChange={(e) => setPharmacyPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="452001"
                  className={FIELD}
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
              <div>
                <label className="text-sm font-medium">Vehicle type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className={FIELD}
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v.charAt(0) + v.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Vehicle registration number</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="MP 09 AB 1234"
                  className={FIELD}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={FIELD}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You will use this to sign in. It must be at least 8 characters.
            </p>
          </div>

          {!otpSent ? (
            <Button
              className="w-full"
              onClick={handleSendOtp}
              disabled={busy || phone.length !== 10}
            >
              Send OTP to my phone
            </Button>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`${FIELD} text-center text-xl tracking-widest`}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleRegister}
                disabled={busy || otp.length !== 6}
              >
                {busy ? 'Creating account...' : 'Create account'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => { setOtpSent(false); setOtp('') }}
                disabled={busy}
              >
                Resend OTP
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="text-primary underline">
            Sign In
          </a>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          By creating an account you accept our{' '}
          <a href="/terms" className="underline">terms of service</a> and{' '}
          <a href="/privacy" className="underline">privacy policy</a>.
        </p>
      </div>
    </div>
  )
}
