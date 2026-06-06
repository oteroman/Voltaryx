'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun, Minimize2 } from 'lucide-react'
import { cn } from '@/components/ui/cn'

type Theme = 'dark' | 'day' | 'minimal'

const THEMES: { value: Theme; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'dark',    label: 'Void',     icon: Moon,      description: 'Oscuro · para técnicos en campo'     },
  { value: 'day',     label: 'Día',      icon: Sun,       description: 'Claro · alta legibilidad exterior'   },
  { value: 'minimal', label: 'Ash',      icon: Minimize2, description: 'Minimalista · gestión y reportes'    },
]

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('voltaryx-theme', theme)
}

export function ThemeSwitcher() {
  const [current, setCurrent] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('voltaryx-theme') as Theme | null
    const theme = saved ?? 'dark'
    setCurrent(theme)
    applyTheme(theme)
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex flex-col gap-2">
      {THEMES.map(t => {
        const Icon = t.icon
        const active = current === t.value
        return (
          <button
            key={t.value}
            onClick={() => { setCurrent(t.value); applyTheme(t.value) }}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
              active
                ? 'border-volt-500 bg-volt-500/10 text-ink-primary'
                : 'border-border-subtle bg-surface-1 text-ink-secondary hover:border-border',
            )}
          >
            <Icon size={18} className={active ? 'text-volt-500' : 'text-ink-tertiary'} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', active ? 'text-ink-primary' : 'text-ink-secondary')}>
                {t.label}
              </p>
              <p className="text-xs text-ink-tertiary">{t.description}</p>
            </div>
            {active && (
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-volt-500" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Script to inject in <head> to avoid flash — call applyTheme before first paint
export const themeScript = `
  (function(){
    try {
      var t = localStorage.getItem('voltaryx-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch(e){}
  })();
`
