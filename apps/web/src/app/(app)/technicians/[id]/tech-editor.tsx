'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Shield, Zap, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/components/ui/cn'

interface Cert { name: string; expiry: string | null }

interface Props {
  techId: string
  initialSkills: string[]
  initialCertifications: Cert[]
  initialTerritory: string
  initialPhone: string
  initialMaxOrders: number
  initialHireDate: string
}

const SKILL_SUGGESTIONS = [
  'UPS Liebert', 'UPS APC', 'UPS Eaton', 'UPS VERTIV',
  'Banco de baterías', 'Módulos de potencia', 'Cooling de precisión',
  'ATS / Transferencia', 'Tableros eléctricos', 'Sistemas de monitoreo',
  'Trabajo en altura', 'Electricidad MT', 'Electricidad BT',
  'Redes y cableado estructurado', 'Puesta a tierra',
]

const CERT_SUGGESTIONS = [
  'Electricidad Media Tensión', 'Trabajo en Altura',
  'Primeros Auxilios', 'SCTR Vigente',
  'Licencia de Conducir A1', 'Cert. Liebert / VERTIV',
  'Cert. APC / Schneider', 'Cert. Eaton',
]

export function TechEditor({
  techId, initialSkills, initialCertifications,
  initialTerritory, initialPhone, initialMaxOrders, initialHireDate,
}: Props) {
  const router = useRouter()
  const [skills,  setSkills]  = useState<string[]>(initialSkills)
  const [certs,   setCerts]   = useState<Cert[]>(initialCertifications)
  const [territory, setTerritory] = useState(initialTerritory)
  const [phone,   setPhone]   = useState(initialPhone)
  const [maxOrders, setMaxOrders] = useState(initialMaxOrders)
  const [hireDate,  setHireDate]  = useState(initialHireDate)
  const [newSkill,  setNewSkill]  = useState('')
  const [newCertName, setNewCertName] = useState('')
  const [newCertExpiry, setNewCertExpiry] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  function addSkill(s: string) {
    const trimmed = s.trim()
    if (!trimmed || skills.includes(trimmed)) return
    setSkills(prev => [...prev, trimmed])
    setNewSkill('')
    setSaved(false)
  }

  function removeSkill(s: string) {
    setSkills(prev => prev.filter(x => x !== s))
    setSaved(false)
  }

  function addCert() {
    if (!newCertName.trim()) return
    setCerts(prev => [...prev, { name: newCertName.trim(), expiry: newCertExpiry || null }])
    setNewCertName(''); setNewCertExpiry('')
    setSaved(false)
  }

  function removeCert(i: number) {
    setCerts(prev => prev.filter((_, idx) => idx !== i))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const sb = createClient()
    const { error: err } = await sb.from('profiles').update({
      skills,
      certifications: certs,
      territory:   territory.trim() || null,
      phone:       phone.trim() || null,
      max_daily_orders: maxOrders,
      hire_date:   hireDate || null,
      updated_at:  new Date().toISOString(),
    }).eq('id', techId)

    if (err) { setError(err.message); setSaving(false); return }
    setSaved(true)
    setSaving(false)
    router.refresh()
  }

  const certExpiringSoon = certs.filter(c => {
    if (!c.expiry) return false
    return new Date(c.expiry) < new Date(Date.now() + 30 * 86400000)
  })

  return (
    <div className="flex flex-col gap-4">

      {/* Datos del perfil */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-tertiary">Perfil</h2>
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-1 p-4">
          <Field label="Teléfono">
            <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setSaved(false) }}
              placeholder="+51 999 999 999" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha ingreso">
              <input type="date" value={hireDate} onChange={e => { setHireDate(e.target.value); setSaved(false) }}
                className={inputCls} />
            </Field>
            <Field label="Cap. diaria (OTs)">
              <input type="number" value={maxOrders} onChange={e => { setMaxOrders(parseInt(e.target.value) || 1); setSaved(false) }}
                min="1" max="20" className={inputCls} />
            </Field>
          </div>
          <Field label="Territorio / Zona">
            <input type="text" value={territory} onChange={e => { setTerritory(e.target.value); setSaved(false) }}
              placeholder="Lima Norte, Miraflores, Callao..." className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Especialidades / Skills */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
          <Zap size={13} className="text-volt-400" />Especialidades
        </h2>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          {/* Tags existentes */}
          <div className="mb-3 flex flex-wrap gap-2">
            {skills.map(s => (
              <span key={s} className="flex items-center gap-1.5 rounded-full bg-volt-500/10 pl-3 pr-1 py-1 text-xs font-semibold text-volt-400">
                {s}
                <button onClick={() => removeSkill(s)}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-volt-500/20 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <p className="text-xs text-ink-tertiary">Sin especialidades registradas</p>
            )}
          </div>

          {/* Sugerencias rápidas */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SKILL_SUGGESTIONS.filter(s => !skills.includes(s)).slice(0, 8).map(s => (
              <button key={s} onClick={() => addSkill(s)}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-ink-secondary hover:border-volt-500 hover:text-volt-400 transition-colors">
                + {s}
              </button>
            ))}
          </div>

          {/* Input personalizado */}
          <div className="flex gap-2">
            <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill(newSkill)}
              placeholder="Agregar otra especialidad..." className={cn(inputCls, 'flex-1')} />
            <button onClick={() => addSkill(newSkill)}
              className="flex h-touch items-center gap-1 rounded-lg bg-surface-2 px-3 text-sm text-ink-secondary hover:bg-surface-3 transition-colors">
              <Plus size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Certificaciones */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
          <Shield size={13} className="text-blue-400" />Certificaciones
        </h2>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">

          {certExpiringSoon.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
              <p className="text-xs text-amber-400 font-semibold">
                ⚠️ {certExpiringSoon.map(c => c.name).join(', ')} — vence pronto
              </p>
            </div>
          )}

          {/* Lista certificaciones */}
          <div className="mb-3 flex flex-col gap-2">
            {certs.map((c, i) => {
              const expiringSoon = c.expiry && new Date(c.expiry) < new Date(Date.now() + 30 * 86400000)
              const expired      = c.expiry && new Date(c.expiry) < new Date()
              return (
                <div key={i} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2',
                  expired ? 'border-critical/30 bg-critical/5' :
                  expiringSoon ? 'border-amber-500/30 bg-amber-500/5' :
                  'border-border-subtle bg-surface-2')}>
                  <Shield size={13} className={expired ? 'text-critical' : expiringSoon ? 'text-amber-400' : 'text-success'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink-primary truncate">{c.name}</p>
                    {c.expiry && (
                      <p className={cn('text-xs',
                        expired ? 'text-critical' : expiringSoon ? 'text-amber-400' : 'text-ink-tertiary')}>
                        {expired ? 'VENCIDA · ' : expiringSoon ? 'Vence ' : 'Vigente hasta '}
                        {new Date(c.expiry).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <button onClick={() => removeCert(i)}
                    className="flex-shrink-0 text-ink-tertiary hover:text-critical transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )
            })}
            {certs.length === 0 && (
              <p className="text-xs text-ink-tertiary">Sin certificaciones registradas</p>
            )}
          </div>

          {/* Sugerencias rápidas */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {CERT_SUGGESTIONS.filter(s => !certs.find(c => c.name === s)).slice(0, 6).map(s => (
              <button key={s} onClick={() => { setNewCertName(s) }}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs text-ink-secondary hover:border-blue-500 hover:text-blue-400 transition-colors">
                + {s}
              </button>
            ))}
          </div>

          {/* Agregar certificación */}
          <div className="flex flex-col gap-2">
            <input type="text" value={newCertName} onChange={e => setNewCertName(e.target.value)}
              placeholder="Nombre de la certificación" className={inputCls} />
            <div className="flex gap-2">
              <div className="flex-1">
                <input type="date" value={newCertExpiry} onChange={e => setNewCertExpiry(e.target.value)}
                  className={inputCls} />
                <p className="mt-0.5 text-xs text-ink-tertiary px-1">Fecha de vencimiento (opcional)</p>
              </div>
              <button onClick={addCert} disabled={!newCertName.trim()}
                className="flex h-touch items-center gap-1 rounded-lg bg-surface-2 px-3 text-sm text-ink-secondary hover:bg-surface-3 disabled:opacity-40 transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Guardar */}
      {error && <p className="rounded bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>}

      <button onClick={save} disabled={saving}
        className={cn('flex h-touch w-full items-center justify-center gap-2 rounded-xl font-semibold transition-colors',
          saved
            ? 'bg-success/20 text-success'
            : 'bg-volt-500 text-ink-inverse hover:bg-volt-400 disabled:opacity-40')}>
        {saving ? 'Guardando...' : saved ? <><Save size={16} />Guardado</> : <><Save size={16} />Guardar cambios</>}
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-ink-secondary">{label}</label>{children}</div>
}
const inputCls = 'h-touch w-full rounded-lg bg-surface-2 px-4 text-sm text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500'
