'use client'

import Link from 'next/link'
import { Pill, ShieldCheck, Store, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'Browse medicines', href: '/medicines' },
      { label: 'Upload prescription', href: '/prescriptions/upload' },
      { label: 'Cart', href: '/cart' },
      { label: 'Track an order', href: '/orders' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Contact support', href: '/contact' },
      { label: 'Serviceable pincodes', href: '/medicines' },
      { label: 'Become a pharmacy partner', href: '/register' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Cancellation & refunds', href: '/refund-policy' },
      { label: 'Prescription policy', href: '/terms#prescriptions' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      {/* Pharmacies and riders work out of the same sign-in as customers, so
          the entry point is here rather than buried on the auth pages. */}


      <div className="container mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Mediconnect"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-lg font-bold tracking-tight">Mediconnect</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Online medicine delivery with pharmacist-verified prescriptions and
              a delivery code that proves the right medicines reached you.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Medicines dispensed by licensed pharmacies only
              </li>
              <li className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Delivery OTP confirmed by you, not the rider
              </li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Mediconnect. Medicines are
            dispensed against a valid prescription where applicable.
          </p>
          <p>
            Not a substitute for medical advice. If you have an emergency, call{' '}
            <span className="font-medium text-foreground">108</span> or{' '}
            <span className="font-medium text-foreground">112</span>.
          </p>
        </div>
      </div>
    </footer>
  )
}
