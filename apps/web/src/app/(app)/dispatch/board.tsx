'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  AlertTriangle, ChevronRight, Clock, User2, MapPin,
  X, Check, Calendar, Map as MapIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

const TechnicianMap = dynamic(
  () => import('@/components/dispatch/technician-map'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-ink-tertiary">Cargando mapa...</div> },
)

/* ── Types ────────────────────────────────────────────────────────────────── */
interface Order {
  id: string
  order_number: string
  type: string
  status: string
  priority: string
  scheduled_date: string
  scheduled_time: string | null
  estimated_duration_min: number | null
  assigned_to: string | null
  description: string | null
  customers: { id: string; name: string } | null
  sites: { name: string; address: string | null } | null
}

interface Technician {
  id: string
  full_name: string | null
  role: string
  skills?: string[]
}

interface Props {
  initialOrders: Order[]
  technicians: Technician[]
  today: string
  tomorrow: string
}

/* ── Constants ────────────────────────────────────────────────────────────── */
const PRIORITY_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  critical: { label: 'Crítico',  cls: 'bg-critical/20 text-critical',        dot: 'bg-critical'   },
  high:     { label: 'Alto',     cls: 'bg-amber-500/20 text-amber-400',      dot: 'bg-amber-400'  },
  medium:   { label: 'Medio',    cls: 'bg-yellow-500/20 text-yellow-400',    dot: 'bg-yellow-400' },
  low:      { label: 'Bajo',     cls: 'bg-surface-3 text-ink-secondary',     dot: 'bg-ink-tertiary'},
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Programada',  cls: 'bg-surface-3 text-ink-secondary'   },
  in_transit:  { label: 'En camino',   cls: 'bg-blue-500/20 text-blue-400'      },
  on_site:     { label: 'En sitio',    cls: 'bg-purple-500/20 text-purple-400'  },
  in_progress: { label: 'En progreso', cls: 'bg-volt-500/20 text-volt-400'      },
}

const TYPE_LABEL: Record<string, string> = {
  preventive:   'Preventivo',
  corrective:   'Correctivo',
  emergency:    'Emergencia',
  installation: 'Instalación',
  inspection:   'Inspección',
}

const TYPE_SKILL_MAP: Record<string, string[]> = {
  preventive:   ['UPS Liebert', 'UPS APC', 'UPS Eaton', 'UPS VERTIV', 'Banco de baterías'],
  corrective:   ['UPS Liebert', 'UPS APC', 'UPS Eaton', 'UPS VERTIV', 'Módulos de potencia'],
  emergency:    ['UPS Liebert', 'UPS APC', 'UPS Eaton', 'UPS VERTIV', 'Electricidad MT', 'Electricidad BT'],
  installation: ['Instalación', 'Redes y cableado estructurado', 'Puesta a tierra', 'Electricidad BT'],
  inspection:   ['Sistemas de monitoreo', 'Electricidad MT', 'Electricidad BT'],
}

function fmtDate(iso: string, today: string, tomorrow: string) {
  if (iso === today)    return 'Hoy'
  if (iso === tomorrow) return 'Mañana'
  return new Date(iso + 'T12:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(t: string | null) {
  return t ? t.slice(0, 5) : ''
}

/* ── Board ────────────────────────────────────────────────────────────────── */
export function DispatchBoard({ initialOrders, technicians, today, tomorrow }: Props) {
  const [orders,       setOrders]       = useState<Order[]>(initialOrders)
  const [tab,          setTab]          = useState<'today' | 'tomorrow' | 'week' | 'map'>('today')
  const [assigning,    setAssigning]    = useState<Order | null>(null)
  const [loadingId,    setLoadingId]    = useState<string | null>(null)
  const [error,        setError]        = useState('')

  /* Filtrar por fecha según tab */
  const filtered = useMemo(() => {
    if (tab === 'today')    return orders.filter(o => o.scheduled_date === today)
    if (tab === 'tomorrow') return orders.filter(o => o.scheduled_date === tomorrow)
    return orders
  }, [orders, tab, today, tomorrow])

  const unassigned  = filtered.filter(o => !o.assigned_to)
  const assigned    = filtered.filter(o => !!o.assigned_to)

  /* Por técnico */
  const byTech = useMemo(() => {
    const map = new Map<string, Order[]>()
    technicians.forEach(t => map.set(t.id, []))
    assigned.forEach(o => {
      if (o.assigned_to && map.has(o.assigned_to)) {
        map.get(o.assigned_to)!.push(o)
      }
    })
    return map
  }, [assigned, technicians])

  /* Asignar técnico a una OT */
  const assign = useCallback(async (orderId: string, techId: string | null) => {
    setLoadingId(orderId)
    setError('')
    const sb = createClient()
    const { error: err } = await sb
      .from('work_orders')
      .update({ assigned_to: techId, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (err) { setError(err.message); setLoadingId(null); return }

    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, assigned_to: techId } : o)
    )
    setAssigning(null)
    setLoadingId(null)
  }, [])

  const techName = (id: string | null) =>
    id ? (technicians.find(t => t.id === id)?.full_name ?? 'Técnico') : null

  const tabCls = (t: typeof tab) =>
    cn('flex-1 py-2 text-xs font-semibold rounded-lg transition-colors',
      tab === t
        ? 'bg-volt-500 text-ink-inverse'
        : 'text-ink-tertiary hover:text-ink-secondary')

  const todayCount    = orders.filter(o => o.scheduled_date === today).length
  const tomorrowCount = orders.filter(o => o.scheduled_date === tomorrow).length
  const weekCount     = orders.length

  return (
    <div className="flex flex-col min-h-svh">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-void/95 px-4 pb-3 pt-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink-primary">Despacho</h1>
            <p className="mt-0.5 text-sm text-ink-secondary">
              {unassigned.length > 0
                ? <span className="text-amber-400 font-semibold">{unassigned.length} sin asignar</span>
                : <span className="text-success">Todo asignado</span>}
              {' · '}{technicians.length} técnicos
            </p>
          </div>
          <Link href="/orders"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
            Órdenes
          </Link>
        </div>

        {/* Tabs de fecha + mapa */}
        <div className="mt-3 flex gap-1 rounded-xl bg-surface-2 p-1">
          <button onClick={() => setTab('today')}    className={tabCls('today')}>
            Hoy <span className="opacity-70">({todayCount})</span>
          </button>
          <button onClick={() => setTab('tomorrow')} className={tabCls('tomorrow')}>
            Mañana <span className="opacity-70">({tomorrowCount})</span>
          </button>
          <button onClick={() => setTab('week')}     className={tabCls('week')}>
            7 días <span className="opacity-70">({weekCount})</span>
          </button>
          <button onClick={() => setTab('map')} className={cn(tabCls('map'), 'flex items-center justify-center gap-1')}>
            <MapIcon size={13} />Mapa
          </button>
        </div>
      </header>

      {/* ── Vista Mapa ── */}
      {tab === 'map' && (
        <div className="px-4 py-4" style={{ height: 'calc(100svh - 160px)' }}>
          <TechnicianMap />
        </div>
      )}

      {tab !== 'map' && <div className="flex flex-col gap-5 px-4 py-4">

        {error && (
          <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
        )}

        {/* ── Sin asignar ── */}
        {unassigned.length > 0 && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Sin asignar · {unassigned.length}
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {unassigned.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  today={today}
                  tomorrow={tomorrow}
                  techName={null}
                  onAssign={() => setAssigning(o)}
                  loading={loadingId === o.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Por técnico ── */}
        {technicians.map(tech => {
          const techOrders = byTech.get(tech.id) ?? []
          return (
            <section key={tech.id}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                    techOrders.length > 0 ? 'bg-volt-500/20 text-volt-400' : 'bg-surface-3 text-ink-tertiary',
                  )}>
                    {tech.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-primary leading-tight">
                      {tech.full_name ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-ink-tertiary">
                      {tech.role === 'supervisor' ? 'Supervisor' : 'Técnico'} · {techOrders.length} OT{techOrders.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {/* Indicador carga */}
                <WorkloadPill count={techOrders.length} />
              </div>

              {techOrders.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {techOrders.map(o => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      today={today}
                      tomorrow={tomorrow}
                      techName={tech.full_name}
                      onAssign={() => setAssigning(o)}
                      loading={loadingId === o.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-xs text-ink-tertiary">
                  Sin órdenes asignadas
                </div>
              )}
            </section>
          )
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-10 text-center">
            <Calendar size={28} className="text-ink-tertiary" />
            <p className="text-sm text-ink-secondary">Sin órdenes en este período</p>
          </div>
        )}
      </div>}

      {/* ── Assign Sheet ── */}
      {assigning && (
        <AssignSheet
          order={assigning}
          technicians={technicians}
          currentTechId={assigning.assigned_to}
          onAssign={(techId) => assign(assigning.id, techId)}
          onClose={() => setAssigning(null)}
          loading={loadingId === assigning.id}
        />
      )}
    </div>
  )
}

/* ── Order card ───────────────────────────────────────────────────────────── */
function OrderCard({ order: o, today, tomorrow, techName, onAssign, loading }: {
  order: Order
  today: string
  tomorrow: string
  techName: string | null
  onAssign: () => void
  loading: boolean
}) {
  const pCfg = PRIORITY_CFG[o.priority] ?? PRIORITY_CFG.medium
  const sCfg = STATUS_CFG[o.status]     ?? STATUS_CFG.scheduled
  const isActive = ['in_progress', 'on_site', 'in_transit'].includes(o.status)

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full', pCfg.dot,
          isActive && 'animate-pulse')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-volt-400 font-semibold">{o.order_number}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-medium', pCfg.cls)}>
              {pCfg.label}
            </span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-xs', sCfg.cls)}>
              {sCfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-ink-primary truncate">
            {o.customers?.name ?? '—'}
          </p>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-tertiary">
            {o.sites?.name && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={11} />{o.sites.name}
              </span>
            )}
            <span className="flex items-center gap-1 flex-shrink-0">
              <Clock size={11} />
              {fmtDate(o.scheduled_date, today, tomorrow)}
              {o.scheduled_time && ` ${fmtTime(o.scheduled_time)}`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-tertiary">
            {TYPE_LABEL[o.type] ?? o.type}
            {o.estimated_duration_min && ` · ~${o.estimated_duration_min}min`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Link href={`/orders/${o.id}`} className="text-ink-tertiary hover:text-ink-secondary">
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Botón asignar / reasignar */}
      <div className="mt-3 border-t border-border-subtle pt-2">
        <button
          onClick={onAssign}
          disabled={loading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-colors',
            o.assigned_to
              ? 'border border-border bg-surface-2 text-ink-secondary hover:border-volt-500 hover:text-volt-400'
              : 'bg-volt-500/10 text-volt-400 hover:bg-volt-500/20',
          )}
        >
          <User2 size={13} />
          {loading ? 'Asignando...'
            : o.assigned_to ? `Reasignar (${techName ?? 'técnico'})`
            : 'Asignar técnico'}
        </button>
      </div>
    </div>
  )
}

/* ── Workload pill ────────────────────────────────────────────────────────── */
function WorkloadPill({ count }: { count: number }) {
  const [cls, label] =
    count === 0 ? ['bg-surface-3 text-ink-tertiary', 'Libre']
    : count <= 2 ? ['bg-success/20 text-success', `${count} OT`]
    : count <= 4 ? ['bg-amber-500/20 text-amber-400', `${count} OT`]
    :              ['bg-critical/20 text-critical', `${count} OT`]
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', cls)}>{label}</span>
  )
}

/* ── Assign sheet (bottom modal) ─────────────────────────────────────────── */
function AssignSheet({ order, technicians, currentTechId, onAssign, onClose, loading }: {
  order: Order
  technicians: Technician[]
  currentTechId: string | null
  onAssign: (id: string | null) => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl border-t border-border-subtle bg-surface-1 pb-safe">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="px-4 pb-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-base font-bold text-ink-primary">{order.customers?.name ?? '—'}</p>
              <p className="font-mono text-xs text-volt-400">{order.order_number} · {TYPE_LABEL[order.type] ?? order.type}</p>
            </div>
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary hover:bg-surface-2 transition-colors">
              <X size={18} />
            </button>
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-tertiary">
            Asignar a
          </p>

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {technicians.map(tech => {
              const isCurrent = tech.id === currentTechId
              const requiredSkills = TYPE_SKILL_MAP[order.type]
              const isCompatible =
                requiredSkills !== undefined &&
                Array.isArray(tech.skills) &&
                tech.skills.length > 0 &&
                tech.skills.some(s => requiredSkills.includes(s))
              return (
                <button key={tech.id}
                  onClick={() => onAssign(tech.id)}
                  disabled={loading}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                    isCurrent
                      ? 'border-volt-500 bg-volt-500/10'
                      : 'border-border-subtle bg-surface-2 hover:border-volt-500 hover:bg-volt-500/5',
                    loading && 'opacity-50',
                  )}
                >
                  <div className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isCurrent ? 'bg-volt-500 text-ink-inverse' : 'bg-surface-3 text-ink-secondary',
                  )}>
                    {tech.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-primary">{tech.full_name ?? 'Sin nombre'}</p>
                      {isCompatible && (
                        <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">✓ Compatible</span>
                      )}
                    </div>
                    <p className="text-xs text-ink-tertiary capitalize">{tech.role}</p>
                  </div>
                  {isCurrent && <Check size={16} className="flex-shrink-0 text-volt-500" />}
                </button>
              )
            })}

            {/* Opción quitar asignación */}
            {currentTechId && (
              <button
                onClick={() => onAssign(null)}
                disabled={loading}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-left hover:border-critical/50 hover:bg-critical/5 transition-colors"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-3">
                  <X size={16} className="text-critical" />
                </div>
                <p className="text-sm font-semibold text-critical">Quitar asignación</p>
              </button>
            )}
          </div>

          <div className="mt-4 pb-4">
            <button onClick={onClose}
              className="w-full rounded-xl border border-border py-3 text-sm font-semibold text-ink-secondary hover:bg-surface-2 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
