'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/components/ui/cn'
import { FileCheck, ChevronRight, Calendar, Clock, Repeat } from 'lucide-react'

const TYPE_CFG: Record<string, { label: string; cls: string }> = {
  maintenance: { label: 'Mantenimiento', cls: 'bg-volt-500/15 text-volt-400'      },
  monitoring:  { label: 'Monitoreo',     cls: 'bg-blue-500/15 text-blue-400'      },
  project:     { label: 'Proyecto',      cls: 'bg-purple-500/15 text-purple-400'  },
  adhoc:       { label: 'Ad-hoc',        cls: 'bg-surface-3 text-ink-secondary'   },
}

const STATUS_CFG: Record<string, { label: string; dot: string; cls: string }> = {
  draft:     { label: 'Borrador', dot: 'bg-ink-tertiary', cls: 'text-ink-tertiary'  },
  active:    { label: 'Activo',   dot: 'bg-success',      cls: 'text-success'       },
  expired:   { label: 'Vencido', dot: 'bg-critical',      cls: 'text-critical'      },
  cancelled: { label: 'Cancelado',dot: 'bg-ink-tertiary', cls: 'text-ink-tertiary'  },
}

const BILLING_LABEL: Record<string, string> = {
  monthly:  'Mensual',
  quarterly:'Trimestral',
  annual:   'Anual',
  one_time: 'Pago único',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

type Contract = {
  id: string
  contract_number: string
  type: string
  status: string
  value: number | null
  currency: string
  billing_cycle: string
  start_date: string
  end_date: string | null
  sla_response_hours: number | null
  visits_per_year: number | null
  customers: { id: string; name: string } | null
}

export function ContractsList({ contracts, canEdit }: { contracts: Contract[]; canEdit: boolean }) {
  const [query, setQuery] = useState('')

  const ql = query.toLowerCase()
  const filtered = ql
    ? contracts.filter(c =>
        c.contract_number.toLowerCase().includes(ql) ||
        (c.customers as { name: string } | null)?.name.toLowerCase().includes(ql) ||
        TYPE_CFG[c.type]?.label.toLowerCase().includes(ql) ||
        STATUS_CFG[c.status]?.label.toLowerCase().includes(ql)
      )
    : contracts

  const today = new Date().toISOString().split('T')[0]

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <FileCheck size={32} className="text-ink-tertiary" />
        <div>
          <p className="text-base font-semibold text-ink-secondary">Sin contratos aún</p>
          <p className="mt-1 text-sm text-ink-tertiary">Crea el primer contrato de mantenimiento</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Buscar por cliente, número, tipo..."
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-tertiary">Sin resultados para "{query}"</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => {
            const customer = c.customers as { id: string; name: string } | null
            const typeCfg   = TYPE_CFG[c.type]   ?? TYPE_CFG.adhoc
            const statusCfg = STATUS_CFG[c.status] ?? STATUS_CFG.draft
            const expiring  = c.status === 'active' && c.end_date
              ? daysUntil(c.end_date)
              : null
            const isExpiringSoon = expiring !== null && expiring <= 30 && expiring >= 0
            const isOverdue      = expiring !== null && expiring < 0

            return (
              <Link key={c.id} href={`/contracts/${c.id}`}
                className={cn(
                  'rounded-xl border bg-surface-1 p-4 transition-colors hover:border-border',
                  isExpiringSoon ? 'border-amber-500/30' : 'border-border-subtle',
                )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-ink-primary">
                        {c.contract_number}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', typeCfg.cls)}>
                        {typeCfg.label}
                      </span>
                    </div>
                    {customer && (
                      <p className="mt-0.5 text-sm text-ink-secondary">{customer.name}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {c.start_date && (
                        <span className="flex items-center gap-1 text-xs text-ink-tertiary">
                          <Calendar size={11} />
                          {new Date(c.start_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </span>
                      )}
                      {c.sla_response_hours && (
                        <span className="flex items-center gap-1 text-xs text-ink-tertiary">
                          <Clock size={11} />SLA {c.sla_response_hours}h
                        </span>
                      )}
                      {c.visits_per_year && (
                        <span className="flex items-center gap-1 text-xs text-ink-tertiary">
                          <Repeat size={11} />{c.visits_per_year} visitas/año
                        </span>
                      )}
                    </div>
                    {isExpiringSoon && !isOverdue && (
                      <p className="mt-1.5 text-xs font-medium text-amber-400">
                        Vence en {expiring} día{expiring !== 1 ? 's' : ''}
                      </p>
                    )}
                    {isOverdue && (
                      <p className="mt-1.5 text-xs font-medium text-critical">
                        Vencido hace {Math.abs(expiring!)} día{Math.abs(expiring!) !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className={cn('flex items-center gap-1.5 text-xs font-semibold', statusCfg.cls)}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                      {statusCfg.label}
                    </div>
                    {c.value && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink-primary">{fmt(c.value)}</p>
                        <p className="text-xs text-ink-tertiary">{BILLING_LABEL[c.billing_cycle] ?? c.billing_cycle}</p>
                      </div>
                    )}
                    <ChevronRight size={16} className="text-ink-tertiary" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
