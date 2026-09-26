import { Providers } from '@/components/providers/auth-provider'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}