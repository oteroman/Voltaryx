import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, Calendar, Clock, Building2, AlertTriangle,
  CheckCircle2, FileText, ChevronRight, Zap,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { ActivateContractButton } from './activate-button'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  active:    { label: 'Activo',    cls: 'bg-success/20 text-success'     },
  draft:     { label: 'Borrador',  cls: 'bg-surface-3 text-ink-tertiary' },
  expired:   { label: 'Vencido',   cls: 'bg-critical/20 text-critical'   },
  cancelled: { label: 'Cancelado', cls: 'bg-surface-3 text-ink-tertiary' },
} as const

const TYPE_LABEL: Record<string, string> = {
  maintenance: 'Mantenimiento', monitoring: 'Monitoreo',
  project: 'Proyecto', adhoc: 'Ad-hoc',
}
const CYCLE_LABEL: Record<string, string> = {
  monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual', one_time: 'Pago único',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
}
function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const { data: contract } = await supabase
    .from('contracts')
    .select(`
      *,
      customers(id, name, tax_id),
      profiles:assigned_to(full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!contract) notFound()

  // Órdenes de trabajo asociadas a este cliente dentro del período del contrato
  const { data: relatedOrders } = await supabase
    .from('work_orders')
    .select('id, order_number, type, status, scheduled_date, customers(name)')
    .eq('customer_id', contract.customer_id)
    .gte('scheduled_date', contract.start_date ?? '2000-01-01')
    .lte('scheduled_date', contract.end_date ?? '2099-12-31')
    .order('scheduled_date', { ascending: false })
    .limit(10)

  const customer     = contract.customers as unknown as { id: string; name: string; tax_id: string | null } | null
  const accountMgr   = contract.profiles  as unknown as { full_name: string } | null
  const cfg          = STATUS_CFG[contract.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft
  const daysLeft     = contract.end_date ? daysUntil(contract.end_date) : null
  const isExpiring   = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
  const canEdit      = ['tenant_admin', 'supervisor'].includes(role)

  const completedOrders = (relatedOrders ?? []).filter(o => o.status === 'completed').length
  const totalOrders     = relatedOrders?.length ?? 0

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link href="/contracts"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs text-ink-tertiary">{contract.contract_number}</p>
          <p className="truncate text-base font-semibold text-ink-primary">{customer?.name}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', cfg.cls)}>{cfg.label}</span>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Alerta vencimiento */}
        {isExpiring && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">
              Vence en <strong>{daysLeft} días</strong> — considera renovar o negociar
            </p>
          </div>
        )}

        {/* Info principal */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <InfoRow label="Tipo" value={TYPE_LABEL[contract.type] ?? contract.type} />
          <InfoRow label="Cliente" value={customer?.name ?? '—'} />
          {customer?.tax_id && <InfoRow label="RUC" value={customer.tax_id} mono />}
          {contract.start_date && <InfoRow label="Inicio" value={fmtDate(contract.start_date)} />}
          {contract.end_date && (
            <InfoRow label="Vencimiento"
              value={fmtDate(contract.end_date)}
              accent={isExpiring ? 'amber' : daysLeft !== null && daysLeft < 0 ? 'red' : undefined}
              suffix={daysLeft !== null ? (daysLeft < 0 ? ` (vencido hace ${Math.abs(daysLeft)}d)` : ` (${daysLeft}d)`) : undefined}
            />
          )}
          {contract.value && <InfoRow label="Valor" value={fmt(contract.value)} />}
          {contract.billing_cycle && <InfoRow label="Facturación" value={CYCLE_LABEL[contract.billing_cycle] ?? contract.billing_cycle} />}
          {accountMgr && <InfoRow label="Account manager" value={accountMgr.full_name} />}
        </section>

        {/* SLA */}
        <section className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Niveles de servicio</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {contract.sla_response_hours && (
              <div>
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-volt-500">
                  <Clock size={14} />{contract.sla_response_hours}h
                </div>
                <p className="text-xs text-ink-tertiary">Respuesta</p>
              </div>
            )}
            {contract.sla_resolution_hours && (
              <div>
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-ink-secondary">
                  <CheckCircle2 size={14} />{contract.sla_resolution_hours}h
                </div>
                <p className="text-xs text-ink-tertiary">Resolución</p>
              </div>
            )}
            {contract.visits_per_year && (
              <div>
                <div className="text-lg font-bold text-success">{contract.visits_per_year}</div>
                <p className="text-xs text-ink-tertiary">Visitas/año</p>
              </div>
            )}
          </div>
        </section>

        {/* Notas */}
        {contract.notes && (
          <section className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-tertiary">Alcance / Notas</p>
            <p className="text-sm text-ink-secondary whitespace-pre-wrap">{contract.notes}</p>
          </section>
        )}

        {/* OTs vinculadas */}
        {totalOrders > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-tertiary">
                Órdenes en período · {totalOrders}
              </p>
              <span className="text-xs text-success">{completedOrders} completadas</span>
            </div>
            <div className="flex flex-col gap-2">
              {(relatedOrders ?? []).slice(0, 6).map(o => (
                <Link key={o.id} href={`/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0',
                    o.status === 'completed' ? 'bg-success' :
                    o.status === 'cancelled' ? 'bg-ink-tertiary' : 'bg-volt-500 animate-pulse')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-ink-secondary">{o.order_number}</p>
                    <p className="text-xs text-ink-tertiary capitalize">{o.type}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-ink-tertiary">
                      {o.scheduled_date && new Date(o.scheduled_date + 'T12:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                    </p>
                    <ChevronRight size={13} className="text-ink-tertiary ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Acciones */}
        {canEdit && (
          <div className="flex flex-col gap-2">
            {contract.status === 'draft' && (
              <ActivateContractButton contractId={contract.id} />
            )}
            {contract.status === 'active' && (
              <Link href={`/orders/new?customerId=${customer?.id}`}
                className="flex h-touch w-full items-center justify-center gap-2 rounded-lg bg-volt-500 font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
                <Zap size={16} />Crear OT de mantenimiento
              </Link>
            )}
            {contract.status === 'active' && isExpiring && (
              <Link href={`/contracts/new?customerId=${customer?.id}`}
                className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border border-volt-500 text-volt-500 font-semibold hover:bg-volt-500/10 transition-colors">
                Renovar contrato
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, accent, suffix }: {
  label: string; value: string; mono?: boolean; accent?: 'amber' | 'red'; suffix?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-ink-secondary flex-shrink-0">{label}</span>
      <span className={cn(
        'text-sm text-right',
        mono ? 'font-mono text-ink-tertiary' : 'text-ink-primary',
        accent === 'amber' ? 'text-amber-400' : accent === 'red' ? 'text-critical' : '',
      )}>
        {value}{suffix && <span className="text-xs text-ink-tertiary">{suffix}</span>}
      </span>
    </div>
  )
}
