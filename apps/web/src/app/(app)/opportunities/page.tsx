import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { TrendingUp, ChevronRight, ArrowRight, FileText, Plus } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STAGE_CFG = {
  identified:  { label: 'Identificado', cls: 'bg-surface-3 text-ink-secondary',       pct: 10 },
  qualified:   { label: 'Calificado',   cls: 'bg-blue-500/20 text-blue-400',           pct: 25 },
  proposal:    { label: 'Propuesta',    cls: 'bg-purple-500/20 text-purple-400',        pct: 50 },
  negotiation: { label: 'Negociación',  cls: 'bg-amber-500/20 text-amber-400',          pct: 75 },
  won:         { label: 'Ganado',       cls: 'bg-success/20 text-success',              pct: 100 },
  lost:        { label: 'Perdido',      cls: 'bg-critical/20 text-critical',            pct: 0  },
} as const

const SEV_DOT: Record<string, string> = {
  critical: 'bg-critical', high: 'bg-amber-400', medium: 'bg-yellow-400', low: 'bg-success',
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

export default async function OpportunitiesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  // Oportunidades del módulo de oportunidades
  const { data: opps } = await supabase
    .from('opportunities')
    .select(`
      id, title, description, stage, probability, estimated_value, currency,
      expected_close, created_at,
      customers(id, name), sites(name),
      findings(severity, category)
    `)
    .not('stage', 'in', '("won","lost")')
    .order('estimated_value', { ascending: false })

  // Hallazgos sin oportunidad creada (candidatos)
  const { data: findingCandidates } = await supabase
    .from('findings')
    .select(`
      id, title, description, severity, category, estimated_value, created_at,
      work_orders(id, order_number, customers(id, name), sites(name))
    `)
    .eq('is_opportunity', true)
    .eq('status', 'open')
    .order('severity')
    .order('estimated_value', { ascending: false })

  const totalPipeline = [
    ...(opps ?? []).map(o => o.estimated_value ?? 0),
    ...(findingCandidates ?? []).map(f => f.estimated_value ?? 0),
  ].reduce((s, v) => s + v, 0)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Pipeline</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {(opps?.length ?? 0) + (findingCandidates?.length ?? 0)} oportunidades
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/quotes"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              <FileText size={15} />Cotizaciones
            </Link>
            <Link href="/quotes/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={15} strokeWidth={2.5} />COT
            </Link>
          </div>
        </div>

        {/* Mini funnel */}
        <div className="mt-3 flex gap-1 text-center">
          {(['identified','qualified','proposal','negotiation'] as const).map((stage) => {
            const count = (opps ?? []).filter(o => o.stage === stage).length
            const cfg   = STAGE_CFG[stage]
            return (
              <div key={stage} className="flex-1">
                <div className={cn('rounded-md px-1 py-1 text-xs font-medium', cfg.cls)}>
                  {count}
                </div>
                <p className="mt-0.5 text-xs text-ink-tertiary leading-tight">{cfg.label}</p>
              </div>
            )
          })}
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Oportunidades formales */}
        {(opps ?? []).length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">En gestión</h2>
            <div className="flex flex-col gap-2">
              {(opps ?? []).map((o) => {
                const customer = o.customers as unknown as { id: string; name: string } | null
                const site     = o.sites     as unknown as { name: string } | null
                const finding  = o.findings  as unknown as { severity: string; category: string } | null
                const cfg      = STAGE_CFG[o.stage as keyof typeof STAGE_CFG] ?? STAGE_CFG.identified
                return (
                  <div key={o.id} className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
                    {/* Barra de progreso */}
                    <div className="h-1 bg-surface-3">
                      <div className="h-full bg-volt-500 transition-all" style={{ width: `${cfg.pct}%` }} />
                    </div>
                    <div className="flex items-start gap-3 p-4">
                      {finding && (
                        <div className={cn('mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0', SEV_DOT[finding.severity] ?? 'bg-ink-tertiary')} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-primary">{o.title}</p>
                        <p className="text-xs text-ink-tertiary">{customer?.name}{site ? ` · ${site.name}` : ''}</p>
                        {o.description && (
                          <p className="mt-1 text-xs text-ink-secondary line-clamp-2">{o.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cfg.cls)}>
                            {cfg.label}
                          </span>
                          {o.probability !== null && (
                            <span className="text-xs text-ink-tertiary">{o.probability}% prob.</span>
                          )}
                          {o.expected_close && (
                            <span className="text-xs text-ink-tertiary">
                              Cierre: {new Date(o.expected_close).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {o.estimated_value && (
                          <span className="text-sm font-bold text-success">
                            {formatCurrency(o.estimated_value)}
                          </span>
                        )}
                        <StageAdvancer oppId={o.id} currentStage={o.stage} customerId={customer?.id} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Hallazgos candidatos (sin oportunidad formal aún) */}
        {(findingCandidates ?? []).length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
              Hallazgos sin gestionar · {findingCandidates?.length}
            </h2>
            <p className="mb-3 text-xs text-ink-tertiary">
              Detectados en campo. Conviértelos en propuestas para el cliente.
            </p>
            <div className="flex flex-col gap-2">
              {(findingCandidates ?? []).map((f) => {
                const wo       = f.work_orders as unknown as { id: string; order_number: string; customers: { id: string; name: string } | null; sites: { name: string } | null } | null
                const customer = wo?.customers
                return (
                  <div key={f.id} className="rounded-xl border border-border-subtle bg-surface-1 p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0', SEV_DOT[f.severity] ?? 'bg-ink-tertiary')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-primary">{f.title}</p>
                        <p className="text-xs text-ink-tertiary">
                          {customer?.name}{wo?.sites ? ` · ${wo.sites.name}` : ''}
                          {wo ? ` · ${wo.order_number}` : ''}
                        </p>
                        {f.description && (
                          <p className="mt-1 text-xs text-ink-secondary line-clamp-2">{f.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {f.estimated_value && (
                          <span className="text-sm font-bold text-success">{formatCurrency(f.estimated_value)}</span>
                        )}
                        <Link
                          href={`/opportunities/new?findingId=${f.id}&customerId=${customer?.id ?? ''}&value=${f.estimated_value ?? 0}&title=${encodeURIComponent(f.title)}`}
                          className="flex items-center gap-1 rounded-lg bg-volt-500/10 px-2.5 py-1.5 text-xs font-semibold text-volt-400 hover:bg-volt-500/20 transition-colors"
                        >
                          Gestionar <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {(opps?.length ?? 0) === 0 && (findingCandidates?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <TrendingUp size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin oportunidades abiertas</p>
              <p className="mt-1 text-sm text-ink-tertiary">
                Los hallazgos marcados como oportunidad aparecerán aquí
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StageAdvancer({ oppId, currentStage, customerId }: { oppId: string; currentStage: string; customerId?: string }) {
  const next: Record<string, string> = {
    identified: 'qualified', qualified: 'proposal', proposal: 'negotiation', negotiation: 'won',
  }
  const nextStage = next[currentStage]
  if (!nextStage) return null
  const nextLabel = STAGE_CFG[nextStage as keyof typeof STAGE_CFG]?.label ?? nextStage
  return (
    <Link
      href={`/opportunities/${oppId}/advance?stage=${nextStage}`}
      className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-3 transition-colors"
    >
      → {nextLabel}
    </Link>
  )
}
