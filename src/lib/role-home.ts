/**
 * Where each role belongs after signing in.
 *
 * The registration API always creates a phone-based account, so this is the one
 * place that decides which landing page a role sees. Keeping it in a module
 * stops the home page, login page and dashboard from each inventing their own
 * version.
 */
export const ROLE_HOME: Record<string, string> = {
  CUSTOMER: '/dashboard',
  PHARMACY_OWNER: '/pharmacy',
  PHARMACY_STAFF: '/pharmacy',
  RIDER: '/rider',
  ADMIN: '/admin',
}

/** Fallback for a role we do not recognise, or a signed-out visitor. */
export const DEFAULT_HOME = '/medicines'

export function homeForRole(role?: string | null): string {
  if (!role) return DEFAULT_HOME
  return ROLE_HOME[role] || DEFAULT_HOME
}
