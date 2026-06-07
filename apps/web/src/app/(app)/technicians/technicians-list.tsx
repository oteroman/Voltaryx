'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User2, ChevronRight, Zap, Shield, MapPin, TrendingUp } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/components/ui/cn'

interface TechStat {
  id: string
  full_name: string | null
  role: string
  skills: string[]
  certifications: { name: string; expiry: string | null }[]
  territory: string | null
  phone: string | null
  todayCount: number
  monthDone: number
  completionRate: number | null
  activeNow: boolean
  activeOrder: string | null
  loadPct: number
  maxOrders: number
}

interface Props {
  techStats: TechStat[]
}

export function TechniciansList({ techStats }: Props) {
  const [q, setQ] = useState('')

  const ql = q.toLowerCase()
  const filtered = q
    ? techStats.filter(t =>
        (t.full_name ?? '').toLowerCase().includes(ql) ||
        (t.phone ?? '').toLowerCase().includes(ql) ||
        t.skills.some(s => s.toLowerCase().includes(ql))
      )
    : techStats

  return (
    <>
      <div className="px-4 pt-3 pb-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por nombre, teléfono o habilidad..."
        />
        {q && (
          <p className="mt-2 text-xs text-ink-tertiary">
            {filtered.length} de {techStats.length} técnicos
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-12 text-center">
            <User2 size={32} className="text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">
              {q ? 'Sin resultados para esa búsqueda' : 'Sin técnicos registrados'}
            </p>
          </div>
        ) : (
          filtered.map(t => (
            <Link key={t.id} href={`/technicians/${t.id}`}
              className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-4 hover:border-border transition-colors block">

              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-full text-base font-bold',
                    t.activeNow ? 'bg-volt-500 text-ink-inverse' : 'bg-surface-3 text-ink-secondary',
                  )}>
                    {t.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  {t.activeNow && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-void bg-volt-500 animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink-primary truncate">{t.full_name ?? 'Sin nombre'}</p>
                    <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      t.role === 'supervisor' ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-3 text-ink-secondary')}>
                      {t.role === 'supervisor' ? 'Supervisor' : 'Técnico'}
                    </span>
                  </div>

                  {t.activeNow ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-volt-400 font-semibold">
                      <span className="h-1.5 w-1.5 rounded-full bg-volt-500 animate-pulse inline-block" />
                      En campo · {t.activeOrder}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-ink-tertiary">Disponible</p>
                  )}

                  {t.territory && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-tertiary">
                      <MapPin size={11} />{t.territory}
                    </p>
                  )}
                </div>

                <ChevronRight size={16} className="flex-shrink-0 text-ink-tertiary mt-1" />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-tertiary">Carga hoy</span>
                  <span className={cn('font-semibold',
                    t.loadPct >= 100 ? 'text-critical' : t.loadPct >= 70 ? 'text-amber-400' : 'text-success')}>
                    {t.todayCount}/{t.maxOrders} OTs
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                  <div className={cn('h-1.5 rounded-full transition-all',
                    t.loadPct >= 100 ? 'bg-critical' : t.loadPct >= 70 ? 'bg-amber-400' : 'bg-success')}
                    style={{ width: `${Math.min(100, t.loadPct)}%` }} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-ink-tertiary border-t border-border-subtle pt-2 flex-wrap">
                {t.completionRate !== null && (
                  <span className="flex items-center gap-1">
                    <TrendingUp size={11} />
                    <span className={cn(t.completionRate >= 80 ? 'text-success' : t.completionRate >= 60 ? 'text-amber-400' : 'text-critical')}>
                      {t.completionRate}%
                    </span> cumplimiento mes
                  </span>
                )}
                {t.skills.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Zap size={11} />{t.skills.slice(0, 2).join(' · ')}{t.skills.length > 2 ? ` +${t.skills.length - 2}` : ''}
                  </span>
                )}
                {t.certifications.filter(c => {
                  if (!c.expiry) return false
                  return new Date(c.expiry) < new Date(Date.now() + 30 * 86400000)
                }).length > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Shield size={11} />Cert. próxima a vencer
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
