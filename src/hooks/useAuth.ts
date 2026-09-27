'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browser-client'
import { User, Session } from '@supabase/supabase-js'

export type UserRole =
  | 'CUSTOMER'
  | 'PHARMACY_OWNER'
  | 'PHARMACY_STAFF'
  | 'RIDER'
  | 'ADMIN'

export interface AuthUser extends User {
  role: UserRole
  phone: string
  customer_id?: string
  name?: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUser(profile)
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setUser(profile)
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
  }
}

async function fetchUserProfile(userId: string): Promise<AuthUser | null> {
  const supabase = createClient()
  
  // Fetch user profile from users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('fetchUserProfile error:', error)
    // If profile doesn't exist, create a minimal one from auth user
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      return {
        id: user.id,
        email: user.email || '',
        role: (user.user_metadata?.role as UserRole) || 'CUSTOMER',
        phone: user.user_metadata?.phone || '',
        customer_id: undefined,
        name: user.user_metadata?.name || ''
      } as AuthUser
    }
    return null
  }

  if (!data) return null

  return {
    ...data,
    role: data.role as UserRole,
    phone: data.phone,
    customer_id: data.customer_id,
  } as AuthUser
}