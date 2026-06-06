'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

/* ── Constants ───────────────────────────────────────────────────────────── */
const SERVICE_TYPES = [
  { value: 'corrective',   label: 'Correctivo'  },
  { value: 'preventive',   label: 'Preventivo'  },
  { value: 'inspection',   label: 'Inspección'  },
  { value: 'installation', label: 'Instalación' },
] as const

const PRIORITIES = [
  { value: 'low',    label: 'Baja',   cls: 'border-border bg-surface-2 text-ink-secondary'      },
  { value: 'medium', label: 'Media',  cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  { value: 'high',   label: 'Alta',   cls: 'border-critical/30 bg-critical/10 text-critical'    },
] as const

type Priority = typeof PRIORITIES[number]['value']
type ServiceType = typeof SERVICE_TYPES[number]['value']

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SolicitudPage() {
  const router = useRouter()

  // Profile / customer state
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')

  // Assets catalog
  const [assets, setAssets] = useState<{ id: string; name: string; model: string | null }[]>([])

  // Form fields
  const [serviceType, setServiceType] = useState<ServiceType>('corrective')
  const [assetId, setAssetId] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')

  // Submission state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* Load profile on mount */
  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profileRaw, error: profErr } = await supabase
        .from('profiles')
        .select('role, customer_id, email')
        .eq('id', user.id)
        .single()

      if (profErr || !profileRaw) {
        setProfileError('No se pudo cargar tu perfil. Intenta de nuevo.')
        setLoadingProfile(false)
        return
      }

      const profile = profileRaw as unknown as {
        role: string | null
        customer_id: string | null
        email: string | null
      }

      if (profile.role !== 'client') {
        router.replace('/dashboard')
        return
      }

      let cid: string | null = profile.customer_id ?? null

      // Fallback: find by email
      if (!cid) {
        const emailToMatch = profile.email ?? user.email
        if (emailToMatch) {
          const { data: custRaw } = await supabase
            .from('customers')
            .select('id')
            .eq('email', emailToMatch)
            .limit(1)
            .single()
          cid = (custRaw as unknown as { id: string } | null)?.id ?? null
        }
      }

      if (!cid) {
        setProfileError('Tu cuenta no está vinculada a una empresa. Contacta al administrador.')
        setLoadingProfile(false)
        return
      }

      setCustomerId(cid)

      // assets don't have customer_id directly — resolve via sites
      const { data: sitesRaw } = await supabase
        .from('sites').select('id').eq('customer_id', cid)
      const siteIds = (sitesRaw as unknown as { id: string }[] | null ?? []).map(s => s.id)
      const { data: assetsRaw } = siteIds.length > 0
        ? await supabase.from('assets').select('id, name, model')
            .in('site_id', siteIds).neq('status', 'retired').order('name')
        : { data: [] }

      const loadedAssets = (assetsRaw as unknown as { id: string; name: string; model: string | null }[] | null) ?? []
      setAssets(loadedAssets)
      setLoadingProfile(false)
    }

    init()
  }, [router])

  /* Submit */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId || !description.trim()) return

    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error: insertErr } = await supabase
      .from('work_orders')
      .insert({
        customer_id: customerId,
        type:        serviceType,
        status:      'scheduled',
        priority:    priority,
        description: description.trim(),
      })

    if (insertErr) {
      setError('No se pudo enviar la solicitud. Intenta de nuevo.')
      setLoading(false)
      return
    }

    router.push('/portal')
  }

  const canSubmit = customerId && description.trim().length >= 10 && !loading

  /* ── Render ── */
  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-4 backdrop-blur-sm">
        <Link
          href="/portal"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-2 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-lg font-bold text-ink-primary">Solicitar servicio</h1>
      </header>

      {/* Loading / error state */}
      {loadingProfile ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <p className="text-sm text-ink-tertiary">Cargando...</p>
        </div>
      ) : profileError ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <p className="text-sm text-critical">{profileError}</p>
          <Link href="/portal" className="text-sm text-volt-500 underline">Volver al portal</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 py-5">

          {/* Tipo de servicio */}
          <Field label="Tipo de servicio *">
            <div className="grid grid-cols-2 gap-2">
              {SERVICE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setServiceType(t.value)}
                  className={cn(
                    'rounded-lg border py-2.5 text-sm font-medium transition-colors',
                    serviceType === t.value
                      ? 'border-volt-500 bg-volt-500/10 text-volt-400'
                      : 'border-border bg-surface-2 text-ink-secondary hover:border-border-muted',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Equipo afectado */}
          <Field label="Equipo afectado">
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className={selectCls}
            >
              <option value="">Sin equipo específico</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.model ? ` — ${a.model}` : ''}
                </option>
              ))}
            </select>
            {assets.length === 0 && (
              <p className="mt-1 text-xs text-ink-tertiary">
                No tienes equipos registrados. El servicio se agendará sin equipo específico.
              </p>
            )}
          </Field>

          {/* Descripción */}
          <Field label="Descripción del problema *">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el problema o el servicio que necesitas (mínimo 10 caracteres)..."
              rows={4}
              required
              minLength={10}
              className={cn(inputCls, 'h-auto resize-none py-3')}
            />
            {description.trim().length > 0 && description.trim().length < 10 && (
              <p className="mt-1 text-xs text-critical">Mínimo 10 caracteres</p>
            )}
          </Field>

          {/* Prioridad sugerida */}
          <Field label="Urgencia sugerida">
            <p className="mb-2 text-xs text-ink-tertiary">
              Referencial — el equipo técnico puede ajustar la prioridad según disponibilidad.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'rounded-lg border py-2.5 text-sm font-medium transition-colors',
                    priority === p.value
                      ? p.cls
                      : 'border-border bg-surface-2 text-ink-secondary',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'h-touch w-full flex items-center justify-center gap-2 rounded-xl',
              'bg-volt-500 font-sans text-base font-semibold text-ink-inverse',
              'transition-colors hover:bg-volt-400 active:bg-volt-600',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <Send size={18} />
            {loading ? 'Enviando solicitud...' : 'Enviar solicitud'}
          </button>

          <p className="text-center text-xs text-ink-tertiary">
            Recibirás confirmación cuando un técnico sea asignado.
          </p>
        </form>
      )}
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-ink-secondary">{label}</label>
      {children}
    </div>
  )
}

const inputCls = cn(
  'h-touch w-full rounded-lg bg-surface-2 px-4 text-base text-ink-primary',
  'border border-border outline-none transition-colors placeholder:text-ink-tertiary',
  'focus:border-volt-500',
)
const selectCls = cn(inputCls, 'cursor-pointer appearance-none')
