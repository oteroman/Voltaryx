import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { ConnectivityIndicator } from '@/components/ui/connectivity-indicator'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-svh flex-col bg-void">
      {/* Banner de conectividad — siempre al tope */}
      <ConnectivityIndicator />

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom navigation (mobile-first) */}
      <BottomNav />
    </div>
  )
}
