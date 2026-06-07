import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { Plus, AlertTriangle, CalendarCheck2 } from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { ContractsList } from './contracts-list'

export const dynamic = 'force-dynamic'

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function fmtMrr(n: number) {
  if (n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `S/ ${(n / 1_000).toFixed(0)}K`
  return `S/ ${Math.round(n)}`
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

  const active = (contracts ?? []).filter(c => c.status === 'active')

  const mrr = active.reduce((s, c) => {
    const v = c.value ?? 0
    if (c.billing_cycle === 'monthly')   return s + v
    if (c.billing_cycle === 'quarterly') return s + v / 3
    if (c.billing_cycle === 'annual')    return s + v / 12
    return s
  }, 0)

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
            <p className="text-lg font-bold text-volt-500">{fmtMrr(mrr)}</p>
            <p className="text-xs text-ink-tertiary">MRV mensual</p>
          </div>
          <div className={cn('rounded-lg px-3 py-2 text-center', expiringIn30.length > 0 ? 'bg-amber-500/10' : 'bg-surface-2')}>
            <p className={cn('text-lg font-bold', expiringIn30.length > 0 ? 'text-amber-400' : 'text-ink-secondary')}>
              {expiringIn30.length}
            </p>
            <p className="text-xs text-ink-tertiary">Vencen pronto</p>
          </div>
        </div>
      </header>

      {expiringIn30.length > 0 && (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-400">
              {expiringIn30.length} contrato{expiringIn30.length > 1 ? 's' : ''} vence{expiringIn30.length === 1 ? '' : 'n'} en 30 días
            </p>
            <p className="text-xs text-amber-300/70">Considera renovar o notificar al cliente</p>
          </div>
        </div>
      )}

      <ContractsList contracts={contracts ?? []} canEdit={canEdit} />
    </div>
  )
}
