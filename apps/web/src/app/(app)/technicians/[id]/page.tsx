import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, MapPin, Calendar, Clock,
  TrendingUp, CheckCircle2, AlertTriangle, ChevronRight,
  Zap, Shield, ClipboardList,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'
import { TechEditor } from './tech-editor'

export const dynamic = 'force-dynamic'

function todayISO()    { return new Date().toISOString().split('T')[0]! }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]!
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtHours(h: number) {
  if (h < 1)  return `${Math.round(h * 60)}m`
  if (h < 24) return `${h.toFixed(1)}h`
  return `${(h / 24).toFixed(1)}d`
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: 'Programada',  cls: 'bg-surface-3 text-ink-secondary'    },
  in_transit:  { label: 'En camino',   cls: 'bg-blue-500/20 text-blue-400'       },
  on_site:     { label: 'En sitio',    cls: 'bg-purple-500/20 text-purple-400'   },
  in_progress: { label: 'En progreso', cls: 'bg-volt-500/20 text-volt-400'       },
  completed:   { label: 'Completada',  cls: 'bg-success/20 text-success'         },
  cancelled:   { label: 'Cancelada',   cls: 'bg-surface-3 text-ink-tertiary'     },
}

const TYPE_LABEL: Record<string, string> = {
  preventive: 'Preventivo', corrective: 'Correctivo',
  emergency: 'Emergencia', installation: 'Instalación', inspection: 'Inspección',
}

export default async function TechnicianDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: viewer } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single()
  const viewerRole = (viewer?.role ?? 'technician') as string

  // Técnico puede ver su propio perfil; admin/supervisor puede ver todos
  const isSelf = user!.id === params.id
  if (!['tenant_admin', 'supervisor'].includes(viewerRole) && !isSelf) redirect('/orders')

  const { data: tech } = await supabase
    .from('profiles')
    .select('id, full_name, role, skills, certifications, territory, phone, hire_date, max_daily_orders, email')
    .eq('id', params.id)
    .single()

  if (!tech) notFound()

  const today  = todayISO()
  const d30ago = daysAgo(30)
  const d90ago = daysAgo(90)

  // OTs últimos 90 días
  const { data: recentOrders } = await supabase
    .from('work_orders')
    .select(`
      id, order_number, type, status, priority,
      scheduled_date, scheduled_time,
      started_at, completed_at, created_at,
      customers(name), sites(name)
    `)
    .eq('assigned_to', params.id)
    .gte('scheduled_date', d90ago)
    .order('scheduled_date', { ascending: false })
    .limit(50)

  const orders = recentOrders ?? []
  const last30 = orders.filter(o => o.scheduled_date >= d30ago)
  const last90 = orders

  // Métricas
  const done30     = last30.filter(o => o.status === 'completed').length
  const total30    = last30.filter(o => o.status !== 'cancelled').length
  const done90     = last90.filter(o => o.status === 'completed').length
  const total90    = last90.filter(o => o.status !== 'cancelled').length
  const rate30     = total30  > 0 ? Math.round((done30  / total30)  * 100) : null
  const rate90     = total90  > 0 ? Math.round((done90  / total90)  * 100) : null

  // Tiempo promedio de respuesta (created_at → started_at) en horas
  const responseTimes = orders
    .filter(o => o.started_at && o.created_at)
    .map(o => (new Date(o.started_at!).getTime() - new Date(o.created_at).getTime()) / 3600000)
  const avgResponseH = responseTimes.length
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null

  // Tiempo promedio de resolución en horas
  const resolutionTimes = orders
    .filter(o => o.completed_at && o.created_at)
    .map(o => (new Date(o.completed_at!).getTime() - new Date(o.created_at).getTime()) / 3600000)
  const avgResolutionH = resolutionTimes.length
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : null

  // Distribución por tipo
  const byType: Record<string, number> = {}
  orders.filter(o => o.status === 'completed').forEach(o => {
    byType[o.type] = (byType[o.type] ?? 0) + 1
  })

  const skills         = (tech.skills         ?? []) as string[]
  const certifications = (tech.certifications  ?? []) as { name: string; expiry: string | null }[]
  const canEdit        = ['tenant_admin', 'supervisor'].includes(viewerRole)

  // OTs de hoy
  const todayOrders = orders.filter(o => o.scheduled_date === today)
  const activeNow   = todayOrders.find(o => ['in_transit', 'on_site', 'in_progress'].includes(o.status))

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link href="/technicians"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-primary truncate">{tech.full_name ?? 'Técnico'}</h1>
          <p className="text-xs text-ink-tertiary capitalize">
            {tech.role === 'supervisor' ? 'Supervisor' : 'Técnico'}
            {tech.territory ? ` · ${tech.territory}` : ''}
          </p>
        </div>
        {activeNow && (
          <span className="flex items-center gap-1.5 rounded-full bg-volt-500/20 px-2.5 py-1 text-xs font-semibold text-volt-400">
            <span className="h-1.5 w-1.5 rounded-full bg-volt-500 animate-pulse" />En campo
          </span>
        )}
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">

        {/* Datos básicos */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
          {tech.phone && (
            <InfoRow icon={Phone} label="Teléfono">{tech.phone}</InfoRow>
          )}
          {tech.hire_date && (
            <InfoRow icon={Calendar} label="Ingreso">{fmtDate(tech.hire_date)}</InfoRow>
          )}
          {tech.territory && (
            <InfoRow icon={MapPin} label="Territorio">{tech.territory}</InfoRow>
          )}
          <InfoRow icon={ClipboardList} label="Capacidad diaria">
            {tech.max_daily_orders ?? 6} órdenes/día
          </InfoRow>
        </div>

        {/* Performance metrics */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Performance</h2>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Completion 30d"
              value={rate30 != null ? `${rate30}%` : '—'}
              sub={`${done30} de ${total30} OTs`}
              good={rate30 != null && rate30 >= 80}
              warn={rate30 != null && rate30 < 60}
            />
            <MetricCard
              label="Completion 90d"
              value={rate90 != null ? `${rate90}%` : '—'}
              sub={`${done90} de ${total90} OTs`}
              good={rate90 != null && rate90 >= 80}
              warn={rate90 != null && rate90 < 60}
            />
            <MetricCard
              label="Tiempo respuesta"
              value={avgResponseH != null ? fmtHours(avgResponseH) : '—'}
              sub="promedio inicio"
              good={avgResponseH != null && avgResponseH <= 4}
              warn={avgResponseH != null && avgResponseH > 8}
            />
            <MetricCard
              label="Tiempo resolución"
              value={avgResolutionH != null ? fmtHours(avgResolutionH) : '—'}
              sub="promedio cierre"
              good={avgResolutionH != null && avgResolutionH <= 24}
              warn={avgResolutionH != null && avgResolutionH > 48}
            />
          </div>
        </section>

        {/* Distribución por tipo */}
        {Object.keys(byType).length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Por tipo de servicio</h2>
            <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
              {Object.entries(byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-ink-secondary">{TYPE_LABEL[type] ?? type}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-surface-3 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-volt-500"
                          style={{ width: `${(count / (done90 || 1)) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right text-sm font-bold text-ink-primary">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Skills y certificaciones — editables */}
        {canEdit && (
          <TechEditor
            techId={tech.id}
            initialSkills={skills}
            initialCertifications={certifications}
            initialTerritory={tech.territory ?? ''}
            initialPhone={tech.phone ?? ''}
            initialMaxOrders={tech.max_daily_orders ?? 6}
            initialHireDate={tech.hire_date ?? ''}
          />
        )}

        {!canEdit && (
          <>
            {skills.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Especialidades</h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="rounded-full bg-volt-500/10 px-3 py-1 text-xs font-semibold text-volt-400">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* OTs recientes */}
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
            Historial reciente · {orders.length}
          </h2>
          <div className="flex flex-col gap-2">
            {orders.slice(0, 12).map(o => {
              const sCfg = STATUS_CFG[o.status] ?? STATUS_CFG.scheduled
              const cust = o.customers as unknown as { name: string } | null
              return (
                <Link key={o.id} href={`/orders/${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 hover:border-border transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-volt-400">{o.order_number}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs', sCfg.cls)}>{sCfg.label}</span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-ink-primary truncate">{cust?.name ?? '—'}</p>
                    <p className="text-xs text-ink-tertiary">{TYPE_LABEL[o.type] ?? o.type} · {fmtDate(o.scheduled_date)}</p>
                  </div>
                  <ChevronRight size={14} className="flex-shrink-0 text-ink-tertiary" />
                </Link>
              )
            })}
            {orders.length === 0 && (
              <p className="py-4 text-center text-sm text-ink-tertiary">Sin historial en los últimos 90 días</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType; label: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={15} className="flex-shrink-0 text-ink-tertiary" />
      <span className="w-28 flex-shrink-0 text-sm text-ink-tertiary">{label}</span>
      <span className="text-sm text-ink-primary">{children}</span>
    </div>
  )
}

function MetricCard({ label, value, sub, good, warn }: {
  label: string; value: string; sub: string; good?: boolean; warn?: boolean
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
      <p className="text-xs text-ink-tertiary">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold',
        good ? 'text-success' : warn ? 'text-critical' : 'text-ink-primary')}>
        {value}
      </p>
      <p className="text-xs text-ink-tertiary">{sub}</p>
    </div>
  )
}
