import { createClient } from '@/lib/supabase/server'
import { notFound }     from 'next/navigation'
import Link             from 'next/link'
import { ArrowLeft, Building2, MapPin, User, Plus } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { PortalAccess } from './portal-access'

export const dynamic = 'force-dynamic'

const TIER_CLASS: Record<string, string> = {
  vip:      'bg-volt-500/20 text-volt-400',
  premium:  'bg-purple-500/20 text-purple-400',
  standard: 'bg-surface-3 text-ink-tertiary',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!customer) notFound()

  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('customer_id', params.id)
    .order('name')

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const role     = (profile?.role ?? 'technician') as string
  const canEdit  = ['tenant_admin', 'supervisor'].includes(role)
  const isAdmin  = role === 'tenant_admin'

  // Portal users for this customer (only fetched for admin)
  const { data: portalUsersRaw } = isAdmin
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('customer_id', params.id)
        .eq('role', 'client')
    : { data: [] }

  const portalUsers = (portalUsersRaw ?? []) as { id: string; full_name: string | null; email: string | null }[]

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/customers" className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-ink-primary truncate">{customer.name}</h1>
        </div>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0', TIER_CLASS[customer.tier] ?? TIER_CLASS.standard)}>
          {customer.tier?.toUpperCase()}
        </span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Info básica */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex flex-col gap-3">
          {customer.tax_id && (
            <Row icon={<Building2 size={16} />} label="RUC" value={customer.tax_id} />
          )}
          {customer.industry && (
            <Row icon={<Building2 size={16} />} label="Rubro" value={customer.industry} />
          )}
          {customer.notes && (
            <div className="border-t border-border-subtle pt-3">
              <p className="text-xs text-ink-tertiary mb-1">Notas</p>
              <p className="text-sm text-ink-secondary">{customer.notes}</p>
            </div>
          )}
        </div>

        {/* Sedes */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-secondary uppercase tracking-wide">
              Sedes · {sites?.length ?? 0}
            </h2>
            {canEdit && (
              <Link
                href={`/customers/${customer.id}/sites/new`}
                className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-3 transition-colors"
              >
                <Plus size={13} />
                Agregar sede
              </Link>
            )}
          </div>

          {(sites ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 py-8 text-center">
              <MapPin size={24} className="text-ink-tertiary" />
              <p className="text-sm text-ink-tertiary">No hay sedes registradas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(sites ?? []).map((s) => (
                <div key={s.id} className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 flex flex-col gap-2">
                  <p className="text-sm font-semibold text-ink-primary">{s.name}</p>
                  {s.address && (
                    <div className="flex items-start gap-2 text-xs text-ink-tertiary">
                      <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{s.address}{s.city ? `, ${s.city}` : ''}</span>
                    </div>
                  )}
                  {s.primary_contact && (
                    <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                      <User size={12} className="flex-shrink-0" />
                      <span>{s.primary_contact}</span>
                      {s.primary_phone && <span>· {s.primary_phone}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Portal de cliente */}
        {isAdmin && (
          <PortalAccess
            customerId={params.id}
            initialUsers={portalUsers}
          />
        )}

        {/* Acciones */}
        {canEdit && (
          <Link
            href={`/orders/new?customerId=${customer.id}`}
            className="flex h-touch items-center justify-center gap-2 rounded-lg border border-volt-500 text-volt-500 font-medium text-sm hover:bg-volt-500/10 transition-colors"
          >
            <Plus size={16} />
            Crear orden para este cliente
          </Link>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-ink-tertiary">{icon}</span>
      <span className="text-xs text-ink-tertiary w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-ink-primary">{value}</span>
    </div>
  )
}
