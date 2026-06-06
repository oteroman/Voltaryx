'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, Cpu, User } from 'lucide-react'
import { cn } from '@/components/ui/cn'

const NAV_ITEMS = [
  { href: '/orders',  label: 'Mis Órdenes', icon: ClipboardList },
  { href: '/assets',  label: 'Activos',     icon: Cpu            },
  { href: '/profile', label: 'Perfil',      icon: User           },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="safe-bottom border-t border-border-subtle bg-surface-2"
      aria-label="Navegación principal"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-touch min-w-touch flex-col items-center justify-center gap-0.5 rounded-lg px-3',
                'transition-colors duration-150',
                active
                  ? 'text-volt-500'
                  : 'text-ink-tertiary hover:text-ink-secondary',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className={cn('text-xs font-sans', active ? 'font-medium' : 'font-normal')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
