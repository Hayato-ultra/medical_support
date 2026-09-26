import { redirect } from 'next/navigation'

/**
 * The root URL goes straight to the customer dashboard.
 *
 * /dashboard decides where a visitor actually belongs: signed-in customers get
 * the dashboard, other roles are sent to their own dashboard, and a signed-out
 * visitor is sent to the public catalogue rather than a login wall, because the
 * medicines and policies are readable without an account. The marketing page
 * still lives at /home.
 */
export default function RootPage() {
  redirect('/dashboard?role=customer')
}
