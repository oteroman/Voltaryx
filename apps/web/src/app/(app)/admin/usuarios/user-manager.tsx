'use client'

import { useState } from 'react'
import {
  Plus, Trash2, X, Copy, Check, Eye, EyeOff,
  Shield, Zap, TrendingUp, User2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  role: string
  hire_date: string | null
  phone: string | null
}

interface Props {
  initialUsers: UserRow[]
  currentUserId: string
  roleLabel: Record<string, string>
}

const ROLE_OPTIONS = [
  { value: 'technician',   label: 'Técnico',        icon: Zap,         cls: 'text-volt-400'   },
  { value: 'supervisor',   label: 'Supervisor',      icon: Shield,      cls: 'text-blue-400'   },
  { value: 'commercial',   label: 'Comercial',       icon: TrendingUp,  cls: 'text-purple-400' },
  { value: 'tenant_admin', label: 'Administrador',   icon: Shield,      cls: 'text-amber-400'  },
] as const

const ROLE_BADGE: Record<string, string> = {
  tenant_admin: 'bg-amber-500/20 text-amber-400',
  supervisor:   'bg-blue-500/20 text-blue-400',
  technician:   'bg-volt-500/20 text-volt-400',
  commercial:   'bg-purple-500/20 text-purple-400',
  client:       'bg-surface-3 text-ink-secondary',
}

type Tab = 'all' | 'technician' | 'supervisor' | 'commercial' | 'tenant_admin'

export function UserManager({ initialUsers, currentUserId, roleLabel }: Props) {
  const [users,    setUsers]    = useState<UserRow[]>(initialUsers)
  const [tab,      setTab]      = useState<Tab>('all')
  const [showForm, setShowForm] = useState(false)
  const [email,    setEmail]    = useState('')
  const [name,     setName]     = useState('')
  const [role,     setRole]     = useState<typeof ROLE_OPTIONS[number]['value']>('technician')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [creds,    setCreds]    = useState<{ email: string; password: string } | null>(null)
  const [visible,  setVisible]  = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const filtered = tab === 'all' ? users : users.filter(u => u.role === tab)

  async function invite() {
    if (!email.trim() || !name.trim()) return
    setLoading(true); setError('')
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), fullName: name.trim(), role }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setLoading(false); return }
    setUsers(prev => [...prev, { id: json.userId, full_name: name.trim(), email: email.trim(), role, hire_date: null, phone: null }])
    setCreds({ email: email.trim(), password: json.tempPassword })
    setEmail(''); setName(''); setRole('technician'); setShowForm(false); setLoading(false)
  }

  async function removeUser(userId: string) {
    setDeleting(userId)
    const res = await fetch('/api/admin/usuarios', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== userId))
    setDeleting(null)
  }

  function copyCredentials() {
    if (!creds) return
    navigator.clipboard.writeText(`Voltaryx\nUsuario: ${creds.email}\nContraseña temporal: ${creds.password}\nURL: ${window.location.origin}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all',          label: `Todos (${users.length})`                                },
    { key: 'technician',   label: `Técnicos (${users.filter(u => u.role === 'technician').length})`   },
    { key: 'supervisor',   label: `Supervisores (${users.filter(u => u.role === 'supervisor').length})` },
    { key: 'commercial',   label: `Comerciales (${users.filter(u => u.role === 'commercial').length})` },
    { key: 'tenant_admin', label: `Admins (${users.filter(u => u.role === 'tenant_admin').length})`    },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4">

      {/* Credenciales generadas */}
      {creds && (
        <div className="rounded-xl border border-volt-500/30 bg-volt-500/5 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-volt-400">Usuario creado — comparte el acceso</p>
          <div className="flex flex-col gap-1 font-mono text-sm">
            <span className="text-ink-secondary">Usuario: <span className="text-ink-primary">{creds.email}</span></span>
            <div className="flex items-center gap-2">
              <span className="text-ink-secondary">
                Contraseña: <span className="text-ink-primary">{visible ? creds.password : '••••••••'}</span>
              </span>
              <button onClick={() => setVisible(v => !v)} className="text-ink-tertiary hover:text-ink-secondary">
                {visible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={copyCredentials}
              className="flex items-center gap-1.5 rounded-lg bg-volt-500 px-3 py-1.5 text-xs font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
              {copied ? <><Check size={12} />Copiado</> : <><Copy size={12} />Copiar acceso</>}
            </button>
            <button onClick={() => setCreds(null)}
              className="flex items-center rounded-lg bg-surface-2 px-2.5 py-1.5 text-ink-secondary hover:bg-surface-3 transition-colors">
              <X size={14} />
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-tertiary">El usuario debe cambiar su contraseña al ingresar por primera vez.</p>
        </div>
      )}

      {/* Formulario nuevo usuario */}
      {showForm && (
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink-primary">Nuevo usuario</h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">Nombre completo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Juan Pérez García" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="usuario@mafort.com" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-secondary">Rol</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(r => {
                const Icon = r.icon
                return (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border py-2.5 px-3 text-sm font-medium transition-colors text-left',
                      role === r.value
                        ? `border-current bg-surface-2 ${r.cls}`
                        : 'border-border bg-surface-2 text-ink-secondary hover:border-border',
                    )}>
                    <Icon size={14} />{r.label}
                  </button>
                )
              })}
            </div>
          </div>
          {error && <p className="rounded bg-critical/10 px-3 py-2 text-xs text-critical">{error}</p>}
          <div className="flex gap-2">
            <button onClick={invite} disabled={loading || !email.trim() || !name.trim()}
              className="flex-1 flex h-touch items-center justify-center gap-1.5 rounded-lg bg-volt-500 text-sm font-semibold text-ink-inverse hover:bg-volt-400 disabled:opacity-40 transition-colors">
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="flex h-touch items-center justify-center rounded-lg bg-surface-2 px-3 text-ink-secondary hover:bg-surface-3 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Botón invitar */}
      {!showForm && (
        <button onClick={() => { setShowForm(true); setCreds(null) }}
          className="flex h-touch w-full items-center justify-center gap-2 rounded-xl bg-volt-500 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
          <Plus size={18} strokeWidth={2.5} />
          Agregar usuario al equipo
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              tab === t.key
                ? 'bg-volt-500 text-ink-inverse'
                : 'bg-surface-2 text-ink-secondary hover:bg-surface-3',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista de usuarios */}
      <div className="flex flex-col gap-2">
        {filtered.map(u => {
          const isSelf = u.id === currentUserId
          const badge  = ROLE_BADGE[u.role] ?? ROLE_BADGE.client
          const label  = roleLabel[u.role] ?? u.role
          const initials = u.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'

          return (
            <div key={u.id}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-3 text-sm font-bold text-ink-secondary">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-primary truncate">
                    {u.full_name ?? '—'}
                    {isSelf && <span className="ml-1 text-xs text-ink-tertiary">(tú)</span>}
                  </p>
                  <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', badge)}>
                    {label}
                  </span>
                </div>
                <p className="text-xs text-ink-tertiary truncate">{u.email ?? '—'}</p>
                {u.phone && <p className="text-xs text-ink-tertiary">{u.phone}</p>}
              </div>
              {!isSelf && (
                <button onClick={() => removeUser(u.id)} disabled={deleting === u.id}
                  className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-ink-tertiary hover:bg-critical/10 hover:text-critical disabled:opacity-40 transition-colors"
                  title="Eliminar usuario">
                  {deleting === u.id ? '...' : <Trash2 size={14} />}
                </button>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-10 text-center">
            <User2 size={28} className="mx-auto mb-2 text-ink-tertiary" />
            <p className="text-sm text-ink-tertiary">Sin usuarios en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  )
}

const inputCls = 'h-touch w-full rounded-lg bg-surface-2 px-4 text-sm text-ink-primary border border-border outline-none transition-colors placeholder:text-ink-tertiary focus:border-volt-500'
