'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Cpu, CheckCircle, AlertTriangle, AlertCircle, XCircle, ChevronRight } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/components/ui/cn'

const STATUS_CFG = {
  operational: { label: 'Operativo', Icon: CheckCircle,   cls: 'text-success'      },
  degraded:    { label: 'Degradado', Icon: AlertTriangle, cls: 'text-amber-400'    },
  critical:    { label: 'Crítico',   Icon: AlertCircle,   cls: 'text-critical'     },
  retired:     { label: 'Retirado',  Icon: XCircle,       cls: 'text-ink-tertiary' },
} as const

const CATEGORY_LABEL: Record<string, string> = {
  ups:          'UPS',
  stabilizer:   'Estabilizador',
  battery_bank: 'Banco Baterías',
  precision_ac: 'A/C Precisión',
  other:        'Otro',
}

interface Asset {
  id: string
  name: string
  brand: string | null
  model: string | null
  serial_number: string | null
  capacity_kva: number | null
  status: string
  asset_types: unknown
  sites: unknown
}

interface Props {
  assets: Asset[]
  canEdit: boolean
}

export function AssetsList({ assets, canEdit }: Props) {
  const [q, setQ] = useState('')

  const ql = q.toLowerCase()
  const filtered = q
    ? assets.filter(a => {
        const site = a.sites as { name: string; customers: { name: string } | null } | null
        return (
          (a.name ?? '').toLowerCase().includes(ql) ||
          (a.brand ?? '').toLowerCase().includes(ql) ||
          (a.model ?? '').toLowerCase().includes(ql) ||
          (a.serial_number ?? '').toLowerCase().includes(ql) ||
          (site?.name ?? '').toLowerCase().includes(ql) ||
          (site?.customers?.name ?? '').toLowerCase().includes(ql)
        )
      })
    : assets

  return (
    <>
      <div className="px-4 pt-3 pb-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por nombre, serie, cliente o sede..."
        />
        {q && (
          <p className="mt-2 text-xs text-ink-tertiary">
            {filtered.length} de {assets.length} equipos
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <Cpu size={32} className="text-ink-tertiary" />
            <p className="text-sm text-ink-tertiary">
              {q ? 'Sin resultados para esa búsqueda' : 'No hay activos registrados'}
            </p>
          </div>
        ) : (
          filtered.map(a => {
            const st   = STATUS_CFG[a.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.operational
            const type = a.asset_types as { name: string; category: string } | null
            const site = a.sites as { name: string; customers: { name: string } | null } | null
            return (
              <Link key={a.id} href={`/assets/${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface-3">
                  <st.Icon size={18} className={st.cls} />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-semibold text-ink-primary truncate">{a.name}</span>
                  <div className="flex items-center gap-1.5 text-xs text-ink-tertiary">
                    {type && <span>{CATEGORY_LABEL[type.category] ?? type.category}</span>}
                    {a.brand && <><span>·</span><span>{a.brand}</span></>}
                    {a.capacity_kva && <><span>·</span><span>{a.capacity_kva} kVA</span></>}
                  </div>
                  {site && (
                    <span className="text-xs text-ink-tertiary truncate">
                      {site.customers?.name} — {site.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className={cn('flex items-center gap-1 text-xs font-medium', st.cls)}>
                    <st.Icon size={12} />{st.label}
                  </span>
                  <ChevronRight size={15} className="text-ink-tertiary" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </>
  )
}
