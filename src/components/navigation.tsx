'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/components/ui/theme-provider'
import { createClient } from '@/lib/supabase/browser-client'
import { cn } from '@/lib/utils'
import {
  Package, Pill, Truck, Users, Store, Home, LayoutDashboard,
  ShoppingCart, CreditCard, Menu, X, LogOut, Sun, Moon, Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const navItemsByRole: Record<string, Array<{ label: string; href: string; icon: any }>> = {
  CUSTOMER: [
    { label: 'Medicines', href: '/medicines', icon: Package },
    { label: 'Prescriptions', href: '/prescriptions', icon: Pill },
    { label: 'Orders', href: '/dashboard', icon: ShoppingCart },
    { label: 'Cart', href: '/cart', icon: Package },
  ],
  PHARMACY_OWNER: [
    { label: 'Dashboard', href: '/pharmacy', icon: LayoutDashboard },
    { label: 'Medicines', href: '/medicines', icon: Package },
    { label: 'Prescriptions', href: '/prescriptions', icon: Pill },
  ],
  PHARMACY_STAFF: [
    { label: 'Dashboard', href: '/pharmacy', icon: LayoutDashboard },
    { label: 'Prescriptions', href: '/prescriptions', icon: Pill },
  ],
  RIDER: [
    { label: 'Dashboard', href: '/rider', icon: Truck },
    { label: 'Deliveries', href: '/rider', icon: Package },
  ],
  ADMIN: [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Live Orders', href: '/admin/live-orders', icon: Package },
    { label: 'Rx Queue', href: '/admin/rx-queue', icon: Pill },
    { label: 'Pharmacies', href: '/admin/pharmacies', icon: Store },
    { label: 'Riders', href: '/admin/riders', icon: Truck },
    { label: 'Customers', href: '/admin/customers', icon: Users },
  ],
}

export function Navigation() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = isAuthenticated && user ? navItemsByRole[user.role] || [] : [
    { label: 'Medicines', href: '/medicines', icon: Package },
    { label: 'How it works', href: '/home#how-it-works', icon: Pill },
  ]

  const themeIcon = resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/home'
  }

  if (isLoading) {
    return (
      <header className={cn('sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur', scrolled && 'shadow-md')}>
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 animate-pulse rounded bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={cn('sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur transition-shadow', scrolled && 'shadow-md')}>
      <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
          <Image
            src="/logo.png"
            alt="Mediconnect"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-xl font-bold tracking-tight hidden sm:block">Mediconnect</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!isAdminRoute && isAuthenticated && (
            <>
              <Badge variant="outline" className="hidden sm:inline-flex">
                {user?.role?.replace('_', ' ').toLowerCase()}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          )}

          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {themeIcon}
              <span className="sr-only">
                {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              </span>
            </Button>
            <Link href="/cart" className="relative p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                0
              </span>
            </Link>
            <Link href="/home">
              <Button variant="ghost" size="sm">
                <Home className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4">
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium text-muted-foreground">Theme</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {themeIcon}
              </Button>
            </div>
            {isAuthenticated && !isAdminRoute && (
              <>
                <hr className="my-2" />
                <Button variant="outline" className="w-full justify-start gap-3" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5" />
                  <span>Sign out</span>
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}