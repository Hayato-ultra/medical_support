import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db/client'
import type { UserRole } from './types'

async function resolveCustomerId(userId: string): Promise<string> {
  const existing = await db.orm.Customer.where({ userId }).first()
  if (existing) return existing.id
  return userId
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Phone or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier) {
          throw new Error('Identifier required')
        }

        const isPhone = /^\d{10}$/.test(credentials.identifier)
        const user: any = isPhone
          ? await db.orm.User.where({ phone: credentials.identifier }).first()
          : await db.orm.User.where({ email: credentials.identifier }).first()

        if (!user) {
          throw new Error('No account found with that phone or email')
        }

        if (credentials.otp) {
          if (!isPhone) {
            throw new Error('OTP login is only available with a 10-digit phone number')
          }
          const key = `otp:${credentials.identifier}:${credentials.otp}`
          const storedOtp: any = await db.orm.OtpToken.where({ key }).first()

          if (!storedOtp || storedOtp.used) {
            throw new Error('OTP already used. Request a new one.')
          }
          if (new Date(storedOtp.expiresAt).getTime() < Date.now()) {
            throw new Error('OTP expired. Request a new one.')
          }

          await db.orm.OtpToken.where({ id: storedOtp.id }).update({ used: 1 })
        } else {
          if (!user.passwordHash) {
            throw new Error('No password set for this account. Use OTP login.')
          }
          const isValid = await bcrypt.compare(credentials.password || '', user.passwordHash)
          if (!isValid) {
            throw new Error('Incorrect password')
          }
        }

        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role as UserRole,
          customerId: user.role === 'CUSTOMER' ? await resolveCustomerId(user.id) : '',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? ''
        token.email = user.email ?? ''
        token.phone = user.phone ?? ''
        token.role = user.role
        token.customerId = user.customerId || ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || token.id || ''
        session.user.email = token.email || ''
        session.user.phone = token.phone || ''
        session.user.role = token.role as UserRole
        session.user.customerId = token.customerId || ''
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}
