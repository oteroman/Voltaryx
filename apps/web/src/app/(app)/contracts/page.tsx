import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { Building2, Plus, Calendar, AlertTriangle, CheckCircle2, ChevronRight, Clock, CalendarCheck2 } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  active:    { label: 'Activo',    cls: 'bg-success/20 text-success'          },
  draft:     { label: 'Borrador',  cls: 'bg-surface-3 text-ink-tertiary'      },
  expired:   { label: 'Vencido',   cls: 'bg-critical/20 text-critical'        },
  cancelled: { label: 'Cancelado', cls: 'bg-surface-3 text-ink-tertiary'      },
} as const

const TYPE_LABEL: Record<string, string> = {
  maintenance: 'Mantenimiento', monitoring: 'Monitoreo',
  project: 'Proyecto', adhoc: 'Ad-hoc',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default async function ContractsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const { data: contracts } = await supabase
    .from('contracts')
    .select('*, customers(name, id)')
    .order('status').order('end_date')

  const active   = (contracts ?? []).filter(c => c.status === 'active')
  const draft    = (contracts ?? []).filter(c => c.status === 'draft')
  const expired  = (contracts ?? []).filter(c => c.status === 'expired')

  const mrr = active
    .filter(c => c.billing_cycle === 'monthly' && c.value)
    .reduce((s, c) => s + (c.value ?? 0), 0)

  const expiringIn30 = active.filter(c => c.end_date && daysUntil(c.end_date) <= 30)

  const canEdit = ['tenant_admin', 'supervisor', 'commercial'].includes(role)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Contratos</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{active.length} activos</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/maintenance"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              <CalendarCheck2 size={15} />PM
            </Link>
            {canEdit && (
              <Link href="/contracts/new"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
                <Plus size={16} strokeWidth={2.5} />Nuevo
              </Link>
            )}
          </div>
        </div>

        {/* KPIs de contratos */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
            <p className="text-lg font-bold text-success">{active.length}</p>
            <p className="text-xs text-ink-tertiary">Activos</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
            <p className="text-lg font-bold text-volt-500">{formatCurrency(mrr)}</p>
            <p className="text-xs text-ink-tertiary">MRR</p>
          </div>
          <div className={cn('rounded-lg px-3 py-2 text-center', expiringIn30.length > 0 ? 'bg-amber-500/10' : 'bg-surface-2')}>
            <p className={cn('text-lg font-bold', expiringIn30.length > 0 ? 'text-amber-400' : 'text-ink-secondary')}>
              {expiringIn30.length}
            </p>
            <p className="text-xs text-ink-tertiary">Vencen pronto</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Alertas de vencimiento */}
        {expiringIn30.length > 0 && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400">Vencen en 30 días</h2>
            </div>
            {expiringIn30.map(c => {
              const customer = c.customers as unknown as { name: string } | null
              const days = daysUntil(c.end_date!)
              return (
                <div key={c.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-ink-primary">{customer?.name}</span>
                  <span className="text-amber-400 font-medium">{days} día{days !== 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </section>
        )}

        {/* Contratos activos */}
        {active.length > 0 && (
          <ContractSection title="Activos" contracts={active} />
        )}

        {/* Borradores */}
        {draft.length > 0 && (
          <ContractSection title="Borradores" contracts={draft} />
        )}

        {/* Vencidos */}
        {expired.length > 0 && (
          <ContractSection title="Vencidos" contracts={expired} />
        )}

        {(contracts?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Building2 size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin contratos registrados</p>
              {canEdit && <p className="mt-1 text-sm text-ink-tertiary">Crea el primer contrato de mantenimiento</p>}
            </div>
            {canEdit && (
              <Link href="/contracts/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
                <Plus size={16} />Nuevo contrato
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ContractSection({ title, contracts }: { title: string; contracts: any[] }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">{title} · {contracts.length}</h2>
      <div className="flex flex-col gap-2">
        {contracts.map(c => {
          const customer = c.customers as unknown as { name: string; id: string } | null
          const cfg      = STATUS_CFG[c.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft
          const daysLeft = c.end_date ? daysUntil(c.end_date) : null
          return (
            <Link key={c.id} href={`/contracts/${c.id}`}
              className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-ink-tertiary">{c.contract_number}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cfg.cls)}>{cfg.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink-primary truncate">{customer?.name}</p>
                  <p className="text-xs text-ink-tertiary">
                    {TYPE_LABEL[c.type] ?? c.type}
                    {c.value ? ` · ${formatCurrency(c.value)}` : ''}
                    {c.billing_cycle ? ` / ${c.billing_cycle === 'monthly' ? 'mes' : c.billing_cycle === 'annual' ? 'año' : c.billing_cycle}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <ChevronRight size={15} className="text-ink-tertiary" />
                  {c.end_date && (
                    <div className={cn('flex items-center gap-1 text-xs',
                      daysLeft !== null && daysLeft <= 30 ? 'text-amber-400' :
                      daysLeft !== null && daysLeft < 0  ? 'text-critical' : 'text-ink-tertiary')}>
                      <Calendar size={11} />
                      {daysLeft !== null && daysLeft < 0
                        ? `Vencido hace ${Math.abs(daysLeft)}d`
                        : daysLeft !== null && daysLeft <= 30
                        ? `${daysLeft}d restantes`
                        : new Date(c.end_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: '2-digit' })
                      }
                    </div>
                  )}
                </div>
              </div>
              {c.sla_response_hours && (
                <div className="mt-2 flex items-center gap-3 border-t border-border-subtle pt-2">
                  <span className="flex items-center gap-1 text-xs text-ink-tertiary">
                    <Clock size={11} />SLA respuesta: {c.sla_response_hours}h
                  </span>
                  {c.visits_per_year && (
                    <span className="text-xs text-ink-tertiary">· {c.visits_per_year} visitas/año</span>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
