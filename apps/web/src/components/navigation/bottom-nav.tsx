'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ClipboardList, Cpu, User, TrendingUp,
  Plus, LayoutDashboard, Package, FileText,
} from 'lucide-react'
import { cn } from '@/components/ui/cn'

type Role = string

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const MANAGER_ROLES = ['tenant_admin', 'supervisor', 'commercial']
const CAN_CREATE_ORDER: Role[] = ['tenant_admin', 'supervisor']

interface Props { role: Role }

export function BottomNav({ role }: Props) {
  const pathname = usePathname()

  const isManager   = MANAGER_ROLES.includes(role)
  const showFab     = CAN_CREATE_ORDER.includes(role)
  const isTechnician = role === 'technician'

  let items: (NavItem | null)[]

  if (isTechnician) {
    items = [
      { href: '/orders',  label: 'Órdenes', icon: ClipboardList },
      { href: '/assets',  label: 'Activos', icon: Cpu           },
      { href: '/profile', label: 'Perfil',  icon: User          },
    ]
  } else if (showFab) {
    // admin / supervisor — FAB in center
    items = [
      { href: '/dashboard',    label: 'Inicio',      icon: LayoutDashboard },
      { href: '/orders',       label: 'Órdenes',     icon: ClipboardList   },
      null,                                                                // FAB slot
      { href: '/inventory',    label: 'Inventario',  icon: Package         },
      { href: '/profile',      label: 'Perfil',      icon: User            },
    ]
  } else {
    // commercial — no FAB: Dashboard · Pipeline · Cotizaciones · Perfil
    items = [
      { href: '/dashboard',    label: 'Inicio',      icon: LayoutDashboard },
      { href: '/opportunities',label: 'Pipeline',    icon: TrendingUp      },
      { href: '/quotes',       label: 'Cotizaciones',icon: FileText        },
      { href: '/profile',      label: 'Perfil',      icon: User            },
    ]
  }

  return (
    <nav
      className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-surface-2"
      aria-label="Navegación principal"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item, i) => {
          if (item === null) {
            return (
              <Link
                key="fab"
                href="/orders/new"
                className={cn(
                  '-mt-5 flex h-14 w-14 items-center justify-center rounded-full',
                  'bg-volt-500 shadow-lg shadow-volt-500/30',
                  'transition-transform active:scale-95 hover:bg-volt-400',
                )}
                aria-label="Nueva orden"
              >
                <Plus size={26} className="text-ink-inverse" strokeWidth={2.5} />
              </Link>
            )
          }

          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-touch min-w-touch flex-col items-center justify-center gap-0.5 rounded-lg px-3',
                'transition-colors duration-150',
                active ? 'text-volt-500' : 'text-ink-tertiary hover:text-ink-secondary',
              )}
            >
              <Icon size={22} strokeWidth={active ? 2 : 1.5} />
              <span className={cn('text-xs font-sans', active ? 'font-medium' : 'font-normal')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
