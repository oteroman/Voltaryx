import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { Plus, Building2, Star, ChevronRight } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const TIER_LABEL: Record<string, string> = {
  vip:      'VIP',
  premium:  'Premium',
  standard: 'Standard',
}
const TIER_CLASS: Record<string, string> = {
  vip:      'bg-volt-500/20 text-volt-400',
  premium:  'bg-purple-500/20 text-purple-400',
  standard: 'bg-surface-3 text-ink-tertiary',
}

export default async function CustomersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) {
    redirect('/orders')
  }

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, name, tax_id, industry, tier, is_active,
      sites(count)
    `)
    .eq('is_active', true)
    .order('name', { ascending: true })

  const canEdit = ['tenant_admin', 'supervisor'].includes(role)

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Clientes</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {customers?.length ?? 0} clientes activos
            </p>
          </div>
          {canEdit && (
            <Link
              href="/customers/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 active:bg-volt-600 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nuevo
            </Link>
          )}
        </div>
      </header>

      {/* List */}
      <div className="flex flex-col gap-2 px-4 py-4">
        {(customers ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Building2 size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">No hay clientes registrados</p>
              {canEdit && (
                <p className="mt-1 text-sm text-ink-tertiary">Agrega el primer cliente</p>
              )}
            </div>
            {canEdit && (
              <Link
                href="/customers/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400"
              >
                <Plus size={16} />
                Nuevo cliente
              </Link>
            )}
          </div>
        ) : (
          (customers ?? []).map((c) => {
            const siteCount = (c.sites as unknown as { count: number }[])?.[0]?.count ?? 0
            return (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3.5 hover:border-border active:bg-surface-2 transition-colors"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-3">
                  <Building2 size={20} className="text-ink-secondary" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="font-sans text-sm font-semibold text-ink-primary truncate">
                    {c.name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-ink-tertiary">
                    {c.tax_id && <span>RUC {c.tax_id}</span>}
                    {c.tax_id && <span>·</span>}
                    <span>{siteCount} {siteCount === 1 ? 'sede' : 'sedes'}</span>
                    {c.industry && <><span>·</span><span className="truncate">{c.industry}</span></>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TIER_CLASS[c.tier] ?? TIER_CLASS.standard)}>
                    {c.tier === 'vip' && <Star size={10} className="inline mr-0.5 -mt-0.5" />}
                    {TIER_LABEL[c.tier] ?? c.tier}
                  </span>
                  <ChevronRight size={16} className="text-ink-tertiary" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
