import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, Send, CheckCircle2, XCircle, ExternalLink,
  Building2, Calendar, User2, Package, Wrench, Repeat, HardHat,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { QuoteActions } from './quote-actions'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  draft:    { label: 'Borrador',  cls: 'bg-surface-3 text-ink-secondary' },
  sent:     { label: 'Enviada',   cls: 'bg-blue-500/20 text-blue-400'   },
  accepted: { label: 'Aceptada', cls: 'bg-success/20 text-success'      },
  rejected: { label: 'Rechazada',cls: 'bg-critical/20 text-critical'    },
  expired:  { label: 'Vencida',  cls: 'bg-amber-500/20 text-amber-400'  },
} as const

const LINE_TYPE_ICON: Record<string, React.ElementType> = {
  true:  Repeat,
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      id, quote_number, status, valid_until, subtotal, igv_pct, igv, total, notes, terms, created_at,
      customers(id, name),
      opportunities(id, title),
      profiles!quotes_created_by_fkey(full_name),
      assigned:profiles!quotes_assigned_to_fkey(full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!quote) notFound()

  const { data: items } = await supabase
    .from('quote_items')
    .select('id, description, quantity, unit_price, discount_pct, subtotal, is_rental, rental_months, sort_order, products(description, brand)')
    .eq('quote_id', params.id)
    .order('sort_order')

  const customer   = (quote as any).customers  as { id: string; name: string } | null
  const creator    = (quote as any).profiles   as { full_name: string | null } | null
  const assignee   = (quote as any).assigned   as { full_name: string | null } | null
  const opp        = (quote as any).opportunities as { id: string; title: string } | null

  const cfg        = STATUS_CFG[quote.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft
  const isExpired  = quote.valid_until && new Date(quote.valid_until) < new Date()
  const canEdit    = ['tenant_admin', 'supervisor', 'commercial'].includes(role)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/quotes"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-base font-bold text-volt-400">{quote.quote_number || 'COT-pendiente'}</h1>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', cfg.cls)}>{cfg.label}</span>
          </div>
          <p className="text-xs text-ink-tertiary">{customer?.name ?? '—'}</p>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Alerta vencimiento */}
        {isExpired && quote.status === 'sent' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
            Esta cotización venció el {fmtDate(quote.valid_until!)}. Considera actualizarla.
          </div>
        )}

        {/* Info general */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          <InfoRow icon={Building2} label="Cliente">
            {customer ? (
              <Link href={`/customers/${customer.id}`} className="flex items-center gap-1 text-volt-400 hover:underline">
                {customer.name}<ExternalLink size={11} />
              </Link>
            ) : '—'}
          </InfoRow>
          {quote.valid_until && (
            <InfoRow icon={Calendar} label="Válida hasta">
              <span className={cn(isExpired && quote.status === 'sent' ? 'text-amber-400' : '')}>
                {fmtDate(quote.valid_until)}
              </span>
            </InfoRow>
          )}
          {assignee?.full_name && (
            <InfoRow icon={User2} label="Responsable">{assignee.full_name}</InfoRow>
          )}
          {opp && (
            <InfoRow icon={ExternalLink} label="Oportunidad">
              <Link href={`/opportunities/${opp.id}`} className="text-volt-400 hover:underline">{opp.title}</Link>
            </InfoRow>
          )}
        </div>

        {/* Ítems */}
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Ítems · {items?.length ?? 0}
          </h2>
          <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden">
            {(items ?? []).map((item, i) => {
              const Icon = item.is_rental ? Repeat : (item as any).products ? Package : Wrench
              return (
                <div key={item.id} className={cn('px-4 py-3', i > 0 && 'border-t border-border-subtle')}>
                  <div className="flex items-start gap-2">
                    <Icon size={14} className="mt-0.5 flex-shrink-0 text-ink-tertiary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary">{item.description}</p>
                      <p className="mt-0.5 text-xs text-ink-tertiary">
                        {item.is_rental
                          ? `${fmt(item.unit_price)}/mes × ${item.rental_months} mes${item.rental_months !== 1 ? 'es' : ''}`
                          : `${fmt(item.unit_price)} × ${item.quantity}`}
                        {item.discount_pct > 0 ? ` − ${item.discount_pct}% dscto` : ''}
                      </p>
                    </div>
                    <p className="flex-shrink-0 text-sm font-bold text-ink-primary">{fmt(item.subtotal)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Totales */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-ink-secondary">
              <span>Subtotal</span><span>{fmt(quote.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>IGV ({quote.igv_pct ?? 18}%)</span><span>{fmt(quote.igv ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-border-subtle pt-2 text-base font-bold text-ink-primary">
              <span>Total</span><span className="text-volt-500">{fmt(quote.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Notas */}
        {quote.notes && (
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <p className="mb-1 text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Notas</p>
            <p className="text-sm text-ink-secondary whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Términos */}
        {quote.terms && (
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
            <p className="mb-1 text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Términos</p>
            <p className="text-sm text-ink-tertiary whitespace-pre-wrap">{quote.terms}</p>
          </div>
        )}

        {/* Acciones */}
        {canEdit && (
          <QuoteActions
            quoteId={quote.id}
            status={quote.status}
            customerId={customer?.id ?? ''}
            total={quote.total ?? 0}
            quoteNumber={quote.quote_number}
          />
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={16} className="flex-shrink-0 text-ink-tertiary" />
      <span className="w-28 flex-shrink-0 text-sm text-ink-tertiary">{label}</span>
      <span className="text-sm text-ink-primary">{children}</span>
    </div>
  )
}
