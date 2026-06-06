import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import { UserManager } from './user-manager'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Administrador',
  supervisor:   'Supervisor',
  technician:   'Técnico',
  commercial:   'Comercial',
  client:       'Cliente',
}

export default async function AdminUsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()

  if ((profile?.role as string) !== 'tenant_admin') redirect('/dashboard')

  const { data: usersRaw } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, hire_date, phone')
    .not('role', 'eq', 'client')
    .order('role').order('full_name')

  const users = (usersRaw ?? []) as {
    id: string
    full_name: string | null
    email: string | null
    role: string
    hire_date: string | null
    phone: string | null
  }[]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Equipo</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{users.length} usuarios · gestión del tenant</p>
          </div>
          <Settings size={20} className="text-ink-tertiary" />
        </div>
      </header>

      <UserManager initialUsers={users} currentUserId={user!.id} roleLabel={ROLE_LABEL} />
    </div>
  )
}
