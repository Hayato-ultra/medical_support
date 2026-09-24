import { notFound } from 'next/navigation'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )
  }

  // Auth guard: redirect non-customers to home
  if (!user?.role || user.role.toLowerCase() !== 'customer') {
    router.replace('/')
    return null
  }

  return <div className="min-h-screen">{children}</div>
}