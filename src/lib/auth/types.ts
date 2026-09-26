import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

export type UserRole =
  | 'CUSTOMER'
  | 'PHARMACY_OWNER'
  | 'PHARMACY_STAFF'
  | 'RIDER'
  | 'ADMIN'

declare module 'next-auth' {
  interface User extends DefaultUser {
    role: UserRole
    phone: string
    customerId?: string
  }

  interface Session {
    user: {
      id: string
      role: UserRole
      phone: string
      customerId: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: UserRole
    phone: string
    customerId: string
  }
}
