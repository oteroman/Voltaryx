import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { TrendingUp, ArrowRight, FileText, Plus, Clock, AlertTriangle, CheckCircle2, ChevronRight, Zap } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STAGE_CFG = {
  identified:  { label: 'Identificado', short: 'ID',  cls: 'bg-surface-3 text-ink-secondary',       bar: 'bg-ink-tertiary',  pct: 10 },
  qualified:   { label: 'Calificado',   short: 'CA',  cls: 'bg-blue-500/20 text-blue-400',           bar: 'bg-blue-400',      pct: 25 },
  proposal:    { label: 'Propuesta',    short: 'PR',  cls: 'bg-purple-500/20 text-purple-400',        bar: 'bg-purple-400',    pct: 50 },
  negotiation: { label: 'Negociación',  short: 'NEG', cls: 'bg-amber-500/20 text-amber-400',          bar: 'bg-amber-400',     pct: 75 },
} as const

const STAGE_ORDER = ['identified','qualified','proposal','negotiation'] as const

const SEV_CFG: Record<string, { label: string; dot: string; ring: string }> = {
  critical: { label: 'Crítico', dot: 'bg-critical',   ring: 'border-critical/40'   },
  high:     { label: 'Alto',    dot: 'bg-amber-400',  ring: 'border-amber-400/40'  },
  medium:   { label: 'Medio',   dot: 'bg-yellow-400', ring: 'border-yellow-400/40' },
  low:      { label: 'Bajo',    dot: 'bg-success',    ring: 'border-success/40'    },
}

function fmt(n: number) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `S/ ${(n / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}
function fmtFull(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

export default async function OpportunitiesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const now      = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const stale7    = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const stale3    = new Date(now.getTime() - 3 * 86_400_000).toISOString()

  // All open opportunities
  const { data: oppsRaw } = await supabase
    .from('opportunities')
    .select(`
      id, title, description, stage, probability, estimated_value,
      expected_close, updated_at, assigned_to,
      customers(id, name), sites(name),
      findings(severity, category),
      profiles!assigned_to(full_name)
    `)
    .not('stage', 'in', '("won","lost")')
    .order('estimated_value', { ascending: false })

  // Won this month
  const { data: wonThisMonth } = await supabase
    .from('opportunities')
    .select('estimated_value')
    .eq('stage', 'won')
    .gte('updated_at', monthStart)

  // Quotes sent without response (status=sent, updated_at > 3 days ago)
  const { data: staleQuotes } = await supabase
    .from('quotes')
    .select('id, quote_number, total, updated_at, customers(name)')
    .eq('status', 'sent')
    .lte('updated_at', stale3)
    .order('updated_at')

  // Finding candidates
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

  const opps = (oppsRaw ?? []) as unknown as {
    id: string; title: string; description: string | null; stage: string;
    probability: number | null; estimated_value: number | null;
    expected_close: string | null; updated_at: string;
    customers: { id: string; name: string } | null
    sites: { name: string } | null
    findings: { severity: string; category: string } | null
    profiles: { full_name: string | null } | null
  }[]

  const findings = (findingCandidates ?? []) as unknown as {
    id: string; title: string; description: string | null; severity: string;
    category: string | null; estimated_value: number | null; created_at: string;
    work_orders: { id: string; order_number: string; customers: { id: string; name: string } | null; sites: { name: string } | null } | null
  }[]

  const squotes = (staleQuotes ?? []) as unknown as {
    id: string; quote_number: string; total: number | null; updated_at: string;
    customers: { name: string } | null
  }[]

  // KPIs
  const pipelineTotal = opps.reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const wonTotal      = (wonThisMonth ?? []).reduce((s, o) => s + (o.estimated_value ?? 0), 0)
  const staleOpps     = opps.filter(o => daysAgo(o.updated_at) > 7)

  // Pipeline by stage
  const byStage = STAGE_ORDER.map(stage => ({
    stage,
    items: opps.filter(o => o.stage === stage),
    value: opps.filter(o => o.stage === stage).reduce((s, o) => s + (o.estimated_value ?? 0), 0),
  }))

  const hasActions = findings.length > 0 || squotes.length > 0 || staleOpps.length > 0

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/95 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Pipeline Comercial</h1>
            <p className="mt-0.5 text-xs text-ink-tertiary">
              {opps.length} oportunidades · {findings.length} hallazgos sin gestionar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/quotes"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              <FileText size={13} />Cotizaciones
            </Link>
            <Link href="/quotes/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-xs font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={14} strokeWidth={2.5} />Nueva COT
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-3 gap-2">
          <KpiCard
            label="Pipeline"
            value={fmt(pipelineTotal)}
            sub={`${opps.length} opor.`}
            valueClass="text-ink-primary"
          />
          <KpiCard
            label="Ganado / mes"
            value={fmt(wonTotal)}
            sub={`${wonThisMonth?.length ?? 0} cerradas`}
            valueClass={wonTotal > 0 ? 'text-success' : 'text-ink-tertiary'}
          />
          <KpiCard
            label="Hallazgos"
            value={String(findings.length)}
            sub="sin gestionar"
            valueClass={findings.length > 0 ? 'text-amber-400' : 'text-ink-tertiary'}
          />
        </div>

        {/* ── Requiere acción ── */}
        {hasActions && (
          <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">Requiere acción</h2>
            </div>
            <div className="flex flex-col gap-2">
              {findings.length > 0 && (
                <ActionRow
                  icon={<Zap size={13} className="text-volt-400" />}
                  label={`${findings.length} hallazgo${findings.length > 1 ? 's' : ''} sin convertir en oportunidad`}
                  sub="Detectados por técnicos en campo"
                  href="#findings"
                />
              )}
              {squotes.length > 0 && (
                <ActionRow
                  icon={<Clock size={13} className="text-amber-400" />}
                  label={`${squotes.length} cotización${squotes.length > 1 ? 'es' : ''} enviada${squotes.length > 1 ? 's' : ''} sin respuesta`}
                  sub={`Última respuesta hace más de 3 días`}
                  href="/quotes"
                />
              )}
              {staleOpps.length > 0 && (
                <ActionRow
                  icon={<Clock size={13} className="text-ink-tertiary" />}
                  label={`${staleOpps.length} oportunidad${staleOpps.length > 1 ? 'es' : ''} sin actualizar`}
                  sub="Sin actividad en más de 7 días"
                  href="#pipeline"
                />
              )}
            </div>
          </section>
        )}

        {/* ── Hallazgos sin gestionar ── */}
        {findings.length > 0 && (
          <section id="findings">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                Hallazgos de campo · {findings.length}
              </h2>
              <span className="text-xs text-ink-tertiary">Listos para convertir</span>
            </div>
            <div className="flex flex-col gap-2">
              {findings.map((f) => {
                const wo       = f.work_orders
                const customer = wo?.customers
                const sevCfg   = SEV_CFG[f.severity] ?? SEV_CFG.low
                const age      = daysAgo(f.created_at)
                return (
                  <div key={f.id}
                    className={cn('rounded-xl border bg-surface-1 p-4 transition-colors hover:border-border', sevCfg.ring)}>
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', sevCfg.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-primary leading-snug">{f.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {customer && (
                            <span className="text-xs text-ink-secondary font-medium">{customer.name}</span>
                          )}
                          {wo && (
                            <span className="font-mono text-xs text-ink-tertiary">{wo.order_number}</span>
                          )}
                          {wo?.sites && (
                            <span className="text-xs text-ink-tertiary">{wo.sites.name}</span>
                          )}
                        </div>
                        {f.description && (
                          <p className="mt-1.5 text-xs text-ink-tertiary line-clamp-2 leading-relaxed">{f.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold',
                            f.severity === 'critical' ? 'bg-critical/10 text-critical' :
                            f.severity === 'high'     ? 'bg-amber-500/10 text-amber-400' :
                            f.severity === 'medium'   ? 'bg-yellow-500/10 text-yellow-400' :
                                                        'bg-success/10 text-success'
                          )}>
                            {sevCfg.label}
                          </span>
                          <span className="text-xs text-ink-tertiary">hace {age}d</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {f.estimated_value ? (
                          <span className="text-sm font-bold text-success">{fmtFull(f.estimated_value)}</span>
                        ) : null}
                        <Link
                          href={`/opportunities/new?findingId=${f.id}&customerId=${customer?.id ?? ''}&customerName=${encodeURIComponent(customer?.name ?? '')}&orderId=${wo?.id ?? ''}&orderNumber=${encodeURIComponent(wo?.order_number ?? '')}&value=${f.estimated_value ?? 0}&title=${encodeURIComponent(f.title)}&description=${encodeURIComponent(f.description ?? '')}&severity=${f.severity}`}
                          className="flex items-center gap-1 rounded-lg bg-volt-500/15 px-3 py-1.5 text-xs font-bold text-volt-400 hover:bg-volt-500/25 transition-colors whitespace-nowrap"
                        >
                          Gestionar <ArrowRight size={11} />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Pipeline por etapa ── */}
        {opps.length > 0 && (
          <section id="pipeline">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">Pipeline · {fmtFull(pipelineTotal)}</h2>
              <Link href="/opportunities/new"
                className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-3 transition-colors">
                <Plus size={12} />Nueva
              </Link>
            </div>

            {/* Stage funnel bar */}
            <div className="mb-4 flex gap-1">
              {byStage.map(({ stage, items, value }) => {
                const cfg = STAGE_CFG[stage as keyof typeof STAGE_CFG]
                if (items.length === 0) return null
                return (
                  <div key={stage} className="flex-1">
                    <div className={cn('h-1.5 rounded-full', cfg.bar)} />
                    <p className="mt-1 text-center text-xs text-ink-tertiary">{items.length}</p>
                    <p className="text-center text-xs font-semibold text-ink-secondary">{fmt(value)}</p>
                    <p className="text-center text-xs text-ink-tertiary leading-none">{cfg.label}</p>
                  </div>
                )
              })}
            </div>

            {byStage.map(({ stage, items }) => {
              if (items.length === 0) return null
              const cfg = STAGE_CFG[stage as keyof typeof STAGE_CFG]
              return (
                <div key={stage} className="mb-3">
                  <h3 className={cn('mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.cls)}>
                    {cfg.label}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {items.map((o) => {
                      const customer = o.customers
                      const finding  = o.findings
                      const assigned = o.profiles
                      const isStale  = daysAgo(o.updated_at) > 7
                      const daysToClose = o.expected_close
                        ? Math.ceil((new Date(o.expected_close).getTime() - Date.now()) / 86_400_000)
                        : null
                      return (
                        <div key={o.id}
                          className={cn('rounded-xl border bg-surface-1 overflow-hidden',
                            isStale ? 'border-amber-500/20' : 'border-border-subtle')}>
                          <div className="h-0.5 bg-surface-3">
                            <div className={cn('h-full transition-all', cfg.bar)}
                              style={{ width: `${cfg.pct}%` }} />
                          </div>
                          <div className="flex items-start gap-3 p-3.5">
                            {finding && (
                              <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                                SEV_CFG[finding.severity]?.dot ?? 'bg-ink-tertiary')} />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink-primary leading-snug">{o.title}</p>
                              <p className="mt-0.5 text-xs text-ink-tertiary">
                                {customer?.name}
                                {assigned?.full_name ? ` · ${assigned.full_name}` : ''}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                {o.probability !== null && (
                                  <span className="flex items-center gap-1 text-xs text-ink-tertiary">
                                    <span className="inline-block h-1.5 w-8 rounded-full bg-surface-3 overflow-hidden">
                                      <span className="block h-full bg-volt-500 rounded-full"
                                        style={{ width: `${o.probability}%` }} />
                                    </span>
                                    {o.probability}%
                                  </span>
                                )}
                                {daysToClose !== null && (
                                  <span className={cn('text-xs', daysToClose < 7 ? 'text-amber-400 font-medium' : 'text-ink-tertiary')}>
                                    {daysToClose < 0 ? `vencida hace ${Math.abs(daysToClose)}d`
                                      : daysToClose === 0 ? 'vence hoy'
                                      : `cierra en ${daysToClose}d`}
                                  </span>
                                )}
                                {isStale && (
                                  <span className="flex items-center gap-1 text-xs text-amber-400">
                                    <Clock size={10} />sin actualizar {daysAgo(o.updated_at)}d
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              {o.estimated_value && (
                                <span className="text-sm font-bold text-success">
                                  {fmtFull(o.estimated_value)}
                                </span>
                              )}
                              <StageAdvancer oppId={o.id} currentStage={o.stage} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* ── Estado vacío ── */}
        {opps.length === 0 && findings.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-6 py-14 text-center">
            <TrendingUp size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base font-semibold text-ink-secondary">Sin oportunidades abiertas</p>
              <p className="mt-1 text-sm text-ink-tertiary">
                Los hallazgos marcados como oportunidad aparecerán aquí
              </p>
            </div>
            <Link href="/opportunities/new"
              className="flex items-center gap-1.5 rounded-lg bg-volt-500 px-4 py-2.5 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={15} strokeWidth={2.5} />Crear primera oportunidad
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, valueClass }: { label: string; value: string; sub: string; valueClass: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-3 py-3">
      <p className="text-xs text-ink-tertiary">{label}</p>
      <p className={cn('mt-1 text-lg font-bold leading-none', valueClass)}>{value}</p>
      <p className="mt-0.5 text-xs text-ink-tertiary">{sub}</p>
    </div>
  )
}

function ActionRow({ icon, label, sub, href }: { icon: React.ReactNode; label: string; sub: string; href: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 rounded-lg bg-surface-1/60 px-3 py-2.5 hover:bg-surface-1 transition-colors">
      <span className="flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink-primary">{label}</p>
        <p className="text-xs text-ink-tertiary">{sub}</p>
      </div>
      <ChevronRight size={14} className="flex-shrink-0 text-ink-tertiary" />
    </Link>
  )
}

function StageAdvancer({ oppId, currentStage }: { oppId: string; currentStage: string }) {
  const next: Record<string, string> = {
    identified: 'qualified', qualified: 'proposal', proposal: 'negotiation', negotiation: 'won',
  }
  const nextStage = next[currentStage]
  if (!nextStage) return null
  const nextLabel = STAGE_CFG[nextStage as keyof typeof STAGE_CFG]?.label ?? nextStage
  return (
    <Link
      href={`/opportunities/${oppId}/advance?stage=${nextStage}`}
      className="flex items-center gap-0.5 rounded-lg bg-surface-2 px-2 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-3 transition-colors whitespace-nowrap"
    >
      → {nextLabel}
    </Link>
  )
}
