import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '../ui/button'

export default async function AuthButton() {
  const isDemoMode = process.env.USE_DEMO_MODE === 'true' || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isDemoMode) {
      return (
          <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 italic">Demo Mode</span>
          </div>
      )
  }

  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const signOut = async () => {
    'use server'

    const supabase = createClient()
    await supabase.auth.signOut()
    return redirect('/login')
  }

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600 truncate max-w-[150px]" title={user.email}>{user.email}</span>
      <form action={signOut}>
        <Button variant="outline" size="sm">
          Logout
        </Button>
      </form>
    </div>
  ) : (
    <Link href="/login">
      <Button variant="outline" size="sm">
        Login
      </Button>
    </Link>
  )
}
