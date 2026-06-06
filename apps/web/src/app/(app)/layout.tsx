import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { ConnectivityIndicator } from '@/components/ui/connectivity-indicator'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'technician') as string

  return (
    <div className="flex h-svh flex-col bg-void">
      <ConnectivityIndicator />
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav role={role} />
    </div>
  )
}
