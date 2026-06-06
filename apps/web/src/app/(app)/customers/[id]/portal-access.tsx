'use client'

import { useState } from 'react'
import { Globe, Plus, Trash2, Copy, Check, Eye, EyeOff, X } from 'lucide-react'
import { cn } from '@/components/ui/cn'

interface PortalUser {
  id: string
  full_name: string | null
  email: string | null
}

interface Props {
  customerId: string
  initialUsers: PortalUser[]
}

export function PortalAccess({ customerId, initialUsers }: Props) {
  const [users,   setUsers]   = useState<PortalUser[]>(initialUsers)
  const [open,    setOpen]    = useState(false)
  const [email,   setEmail]   = useState('')
  const [name,    setName]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [creds,   setCreds]   = useState<{ email: string; password: string } | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function grant() {
    if (!email.trim() || !name.trim()) return
    setLoading(true); setError('')
    const res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), fullName: name.trim(), customerId }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error al crear acceso'); setLoading(false); return }
    setUsers(prev => [...prev, { id: json.userId, full_name: name.trim(), email: email.trim() }])
    setCreds({ email: email.trim(), password: json.tempPassword })
    setEmail(''); setName(''); setOpen(false); setLoading(false)
  }

  async function revoke(userId: string) {
    setRevoking(userId)
    const res = await fetch('/api/portal', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId))
    setRevoking(null)
  }

  function copyCredentials() {
    if (!creds) return
    navigator.clipboard.writeText(`Portal Voltaryx\nUsuario: ${creds.email}\nContraseña temporal: ${creds.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
          <Globe size={13} />Acceso al Portal
        </h2>
        {!open && (
          <button
            onClick={() => { setOpen(true); setCreds(null) }}
            className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-3 transition-colors"
          >
            <Plus size={13} />Dar acceso
          </button>
        )}
      </div>

      {/* Credenciales generadas */}
      {creds && (
        <div className="mb-3 rounded-xl border border-volt-500/30 bg-volt-500/5 p-4">
          <p className="mb-2 text-xs font-bold text-volt-400 uppercase tracking-wider">Acceso creado — comparte con el cliente</p>
          <div className="flex flex-col gap-1 font-mono text-sm">
            <span className="text-ink-secondary">Usuario: <span className="text-ink-primary">{creds.email}</span></span>
            <div className="flex items-center gap-2">
              <span className="text-ink-secondary">Contraseña:&nbsp;
                <span className="text-ink-primary">{visible ? creds.password : '••••••••••'}</span>
              </span>
              <button onClick={() => setVisible(v => !v)} className="text-ink-tertiary hover:text-ink-secondary">
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={copyCredentials}
              className="flex items-center gap-1.5 rounded-lg bg-volt-500 px-3 py-1.5 text-xs font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              {copied ? <><Check size={12} />Copiado</> : <><Copy size={12} />Copiar credenciales</>}
            </button>
            <button onClick={() => setCreds(null)}
              className="flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-ink-secondary hover:bg-surface-3 transition-colors">
              <X size={12} />
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-tertiary">El cliente deberá cambiar su contraseña al ingresar.</p>
        </div>
      )}

      {/* Formulario nuevo acceso */}
      {open && (
        <div className="mb-3 rounded-xl border border-border-subtle bg-surface-1 p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">Nombre del contacto</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Juan Pérez" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="contacto@empresa.com" className={inputCls} />
          </div>
          {error && <p className="rounded bg-critical/10 px-3 py-2 text-xs text-critical">{error}</p>}
          <div className="flex gap-2">
            <button onClick={grant} disabled={loading || !email.trim() || !name.trim()}
              className="flex-1 flex h-touch items-center justify-center gap-1.5 rounded-lg bg-volt-500 text-sm font-semibold text-ink-inverse hover:bg-volt-400 disabled:opacity-40 transition-colors">
              {loading ? 'Creando...' : 'Crear acceso'}
            </button>
            <button onClick={() => { setOpen(false); setError('') }}
              className="flex h-touch items-center justify-center rounded-lg bg-surface-2 px-3 text-ink-secondary hover:bg-surface-3 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuarios con acceso */}
      <div className="rounded-xl border border-border-subtle bg-surface-1 divide-y divide-border-subtle">
        {users.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-ink-tertiary">Sin acceso al portal</p>
            <p className="mt-1 text-xs text-ink-tertiary">Usa "Dar acceso" para crear credenciales de cliente.</p>
          </div>
        ) : (
          users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
                {u.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary truncate">{u.full_name ?? '—'}</p>
                <p className="text-xs text-ink-tertiary truncate">{u.email ?? '—'}</p>
              </div>
              <button
                onClick={() => revoke(u.id)}
                disabled={revoking === u.id}
                className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary hover:bg-critical/10 hover:text-critical disabled:opacity-40 transition-colors"
                title="Revocar acceso"
              >
                {revoking === u.id ? '...' : <Trash2 size={14} />}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

const inputCls = 'h-touch w-full rounded-lg bg-surface-2 px-4 text-sm text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500'
