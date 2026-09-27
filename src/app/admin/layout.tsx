'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Package, Pill, Store, Truck, Users, Box, CreditCard, RotateCcw, BarChart, Settings, AlertTriangle, Loader2 } from 'lucide-react'

const navMain = [
  { title: 'Overview', href: '/admin', icon: LayoutDashboard },
  { title: 'Live Orders', href: '/admin/live-orders', icon: Package, badge: 'LIVE' },
  { title: 'Rx Queue', href: '/admin/rx-queue', icon: Pill, badge: 'SLA' },
  { title: 'Pharmacies', href: '/admin/pharmacies', icon: Store },
  { title: 'Riders', href: '/admin/riders', icon: Truck },
  { title: 'Customers', href: '/admin/customers', icon: Users },
  { title: 'Catalog', href: '/admin/catalog', icon: Box },
]

const navSecondary = [
  { title: 'Payments', href: '/admin/payments', icon: CreditCard },
  { title: 'Refunds', href: '/admin/refunds', icon: RotateCcw },
  { title: 'Reports', href: '/admin/reports', icon: BarChart },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-600" />
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">Sign in as an administrator to view this page.</p>
          <div className="mt-6 flex justify-center gap-4">
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Sign Up</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Admin sidebar"
      >
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <span className="text-xl font-bold text-green-700">MEDSTORE</span>
          <span className="text-xs font-medium text-green-600">Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
          {navMain.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === item.href || pathname.startsWith(item.href + '/')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <Badge
                  variant={item.badge === 'LIVE' ? 'default' : 'secondary'}
                  className={cn(
                    'ml-auto text-[10px] px-1.5 h-5',
                    item.badge === 'SLA' && 'bg-amber-100 text-amber-800 border-amber-300'
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          ))}
          <hr className="my-4 border-muted" />
          {navSecondary.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-8">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-accent"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
          >
            <LayoutDashboard className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <span className="text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}