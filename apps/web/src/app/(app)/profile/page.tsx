import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, Building2, Shield, HelpCircle, Users, Palette } from 'lucide-react'
import { ThemeSwitcher } from '@/components/theme/theme-switcher'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, phone, avatar_url, tenants ( name, plan )')
    .eq('id', user.id)
    .single()

  const tenant = (profile?.tenants as unknown as { name: string; plan: string } | null) ?? null

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-lg font-semibold text-ink-primary">Perfil</h1>
      </header>

      <div className="flex flex-col gap-5 px-4 py-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-volt-100 text-volt-500">
            <User size={28} />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-primary">
              {profile?.full_name ?? user.email}
            </p>
            <p className="capitalize text-sm text-ink-tertiary">{profile?.role ?? 'technician'}</p>
          </div>
        </div>

        {/* Info */}
        <section className="rounded-lg border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <Row icon={<User size={15} />} label="Email" value={user.email ?? '—'} />
          {profile?.phone && (
            <Row icon={<User size={15} />} label="Teléfono" value={profile.phone} />
          )}
          {tenant && (
            <Row icon={<Building2 size={15} />} label="Empresa" value={tenant.name} />
          )}
          {tenant && (
            <Row icon={<Shield size={15} />} label="Plan" value={tenant.plan} capitalize />
          )}
        </section>

        {/* Apariencia */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Palette size={14} className="text-ink-tertiary" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Apariencia</h2>
          </div>
          <ThemeSwitcher />
        </section>

        {/* Gestión de equipo — solo admin */}
        {(profile?.role as string) === 'tenant_admin' && (
          <Link
            href="/admin/usuarios"
            className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-1 text-base font-medium text-ink-secondary hover:text-volt-500 hover:border-volt-500/30 transition-colors"
          >
            <Users size={16} />
            Gestión de equipo
          </Link>
        )}

        {/* Ayuda */}
        <Link
          href="/ayuda"
          className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-1 text-base font-medium text-ink-secondary hover:text-volt-500 hover:border-volt-500/30 transition-colors"
        >
          <HelpCircle size={16} />
          Ayuda / Manual
        </Link>

        {/* Logout */}
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-1 text-base font-medium text-ink-secondary hover:text-critical hover:border-critical/30 transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}

function Row({
  icon, label, value, capitalize,
}: {
  icon: React.ReactNode; label: string; value: string; capitalize?: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-ink-tertiary">{icon}</span>
      <span className="flex-1 text-sm text-ink-secondary">{label}</span>
      <span className={['text-sm text-ink-primary', capitalize ? 'capitalize' : ''].join(' ')}>
        {value}
      </span>
    </div>
  )
}
