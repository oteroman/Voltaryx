'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Star, ChevronRight, Plus } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/components/ui/cn'

const TIER_LABEL: Record<string, string> = { vip: 'VIP', premium: 'Premium', standard: 'Standard' }
const TIER_CLASS: Record<string, string> = {
  vip:      'bg-volt-500/20 text-volt-400',
  premium:  'bg-purple-500/20 text-purple-400',
  standard: 'bg-surface-3 text-ink-tertiary',
}

interface Customer {
  id: string
  name: string
  tax_id: string | null
  industry: string | null
  tier: string
  is_active: boolean
  sites: unknown[]
}

interface Props {
  customers: Customer[]
  canEdit: boolean
}

export function CustomersList({ customers, canEdit }: Props) {
  const [q, setQ] = useState('')

  const filtered = q
    ? customers.filter(c =>
        (c.name ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (c.tax_id ?? '').toLowerCase().includes(q.toLowerCase()) ||
        (c.industry ?? '').toLowerCase().includes(q.toLowerCase()),
      )
    : customers

  return (
    <>
      <div className="px-4 pt-1 pb-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por nombre, RUC o rubro..."
        />
        {q && (
          <p className="mt-2 text-xs text-ink-tertiary">
            {filtered.length} de {customers.length} clientes
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Building2 size={32} className="text-ink-tertiary" />
            <div>
              <p className="text-base text-ink-secondary">
                {q ? 'Sin resultados para esa búsqueda' : 'No hay clientes registrados'}
              </p>
              {canEdit && !q && (
                <p className="mt-1 text-sm text-ink-tertiary">Agrega el primer cliente</p>
              )}
            </div>
            {canEdit && !q && (
              <Link href="/customers/new"
                className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400">
                <Plus size={16} />Nuevo cliente
              </Link>
            )}
          </div>
        ) : (
          filtered.map(c => {
            const siteCount = (c.sites as { count: number }[])?.[0]?.count ?? 0
            return (
              <Link key={c.id} href={`/customers/${c.id}`}
                className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3.5 hover:border-border active:bg-surface-2 transition-colors">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-3">
                  <Building2 size={20} className="text-ink-secondary" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="font-sans text-sm font-semibold text-ink-primary truncate">{c.name}</span>
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
    </>
  )
}
