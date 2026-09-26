import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { Button } from '@/components/ui/button'

/**
 * Shared shell for the static policy pages.
 *
 * Keeps one header and one footer so a change to navigation or legal copy
 * layout only has to happen in a single place.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string
  updated: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/home" className="text-xl font-bold tracking-tight">
            Medical Support
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/home">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <p className="mt-6 text-muted-foreground">{intro}</p>
        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  )
}

export function Section({
  heading,
  children,
  id,
}: {
  heading: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}
