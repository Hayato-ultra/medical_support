import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

type UserRole = 'CUSTOMER' | 'PHARMACY_OWNER' | 'PHARMACY_STAFF' | 'RIDER' | 'ADMIN'

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: UserRole
  }

  interface Session {
    user: {
      id: string
      role: UserRole
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role: UserRole
  }
}