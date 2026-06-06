import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Plus, ChevronRight, Clock, CheckCircle2, XCircle, Send, AlertCircle } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

const STATUS_CFG = {
  draft:    { label: 'Borrador', cls: 'bg-surface-3 text-ink-secondary',        icon: FileText      },
  sent:     { label: 'Enviada',  cls: 'bg-blue-500/20 text-blue-400',           icon: Send          },
  accepted: { label: 'Aceptada', cls: 'bg-success/20 text-success',             icon: CheckCircle2  },
  rejected: { label: 'Rechazada',cls: 'bg-critical/20 text-critical',           icon: XCircle       },
  expired:  { label: 'Vencida',  cls: 'bg-amber-500/20 text-amber-400',         icon: AlertCircle   },
} as const

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default async function QuotesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'technician') as string
  if (!['tenant_admin', 'supervisor', 'commercial'].includes(role)) redirect('/orders')

  const { data: quotes } = await supabase
    .from('quotes')
    .select(`id, quote_number, status, valid_until, total, subtotal, igv, notes, created_at,
      customers(id, name),
      profiles!quotes_assigned_to_fkey(full_name)`)
    .order('created_at', { ascending: false })

  const all = quotes ?? []
  const draft    = all.filter(q => q.status === 'draft')
  const sent     = all.filter(q => q.status === 'sent')
  const accepted = all.filter(q => q.status === 'accepted')
  const rejected = all.filter(q => q.status === 'rejected')
  const expired  = all.filter(q => q.status === 'expired')

  const pipeline = [...draft, ...sent].reduce((s, q) => s + (q.total ?? 0), 0)
  const won      = accepted.reduce((s, q) => s + (q.total ?? 0), 0)

  const canEdit = ['tenant_admin', 'supervisor', 'commercial'].includes(role)

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-void/90 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Cotizaciones</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">{all.length} cotizaciones</p>
          </div>
          {canEdit && (
            <Link href="/quotes/new"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-volt-500 px-3 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              <Plus size={16} strokeWidth={2.5} />Nueva
            </Link>
          )}
        </div>

        {/* KPIs */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
            <p className="text-lg font-bold text-ink-primary">{draft.length + sent.length}</p>
            <p className="text-xs text-ink-tertiary leading-tight">En pipeline</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
            <p className="text-base font-bold text-volt-500">{fmt(pipeline)}</p>
            <p className="text-xs text-ink-tertiary leading-tight">Valor pipeline</p>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2 text-center">
            <p className="text-base font-bold text-success">{fmt(won)}</p>
            <p className="text-xs text-ink-tertiary leading-tight">Cerrado ganado</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* Enviadas — necesitan seguimiento */}
        {sent.length > 0 && (
          <QuoteSection title="Enviadas · requieren seguimiento" quotes={sent} accent="border-blue-500/30 bg-blue-500/5" />
        )}

        {/* Borradores */}
        {draft.length > 0 && (
          <QuoteSection title="Borradores" quotes={draft} />
        )}

        {/* Aceptadas */}
        {accepted.length > 0 && (
          <QuoteSection title="Aceptadas" quotes={accepted} />
        )}

        {/* Rechazadas y Vencidas */}
        {(rejected.length > 0 || expired.length > 0) && (
          <QuoteSection title="Cerradas (rechazadas / vencidas)" quotes={[...rejected, ...expired]} dim />
        )}

        {all.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <FileText size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">Sin cotizaciones aún</p>
              {canEdit && <p className="mt-1 text-sm text-ink-tertiary">Crea tu primera cotizacion desde el catalogo de productos</p>}
            </div>
            {canEdit && (
              <Link href="/quotes/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
                <Plus size={16} />Nueva cotizacion
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function QuoteSection({ title, quotes, accent, dim }: {
  title: string
  quotes: any[]
  accent?: string
  dim?: boolean
}) {
  return (
    <section className={cn(accent && 'rounded-xl border p-3', accent)}>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">{title} · {quotes.length}</h2>
      <div className="flex flex-col gap-2">
        {quotes.map(q => {
          const customer = q.customers as { id: string; name: string } | null
          const cfg = STATUS_CFG[q.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft
          const isExpiringSoon = q.valid_until && q.status === 'sent' &&
            new Date(q.valid_until) < new Date(Date.now() + 7 * 86400000)
          return (
            <Link key={q.id} href={`/quotes/${q.id}`}
              className={cn('rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors',
                dim && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-volt-400 font-semibold">{q.quote_number}</p>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cfg.cls)}>{cfg.label}</span>
                    {isExpiringSoon && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">Vence pronto</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-primary truncate">{customer?.name ?? '—'}</p>
                  {q.valid_until && (
                    <p className="mt-0.5 text-xs text-ink-tertiary">Válido hasta {fmtDate(q.valid_until)}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <ChevronRight size={14} className="text-ink-tertiary" />
                  {q.total && (
                    <p className="text-sm font-bold text-ink-primary">{fmt(q.total)}</p>
                  )}
                  <p className="text-xs text-ink-tertiary">inc. IGV</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
