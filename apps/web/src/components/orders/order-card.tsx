import Link from 'next/link'
import { MapPin, Clock, Wrench, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/components/ui/cn'
import type { Database } from '@/types/database.types'

type WorkOrder = Database['public']['Tables']['work_orders']['Row'] & {
  customer_name?: string
  site_name?:     string
  site_address?:  string
}

const PRIORITY_DOT: Record<string, string> = {
  critical: 'bg-critical',
  high:     'bg-warning',
  normal:   'bg-volt-500',
  low:      'bg-ink-tertiary',
}

const TYPE_LABELS: Record<string, string> = {
  preventive:  'Preventivo',
  corrective:  'Correctivo',
  emergency:   'Emergencia',
  inspection:  'Inspección',
}

interface OrderCardProps {
  order: WorkOrder
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className={cn(
        'group flex items-stretch gap-3 rounded-lg border border-border-subtle bg-surface-1 p-4',
        'transition-colors duration-150 hover:border-border hover:bg-surface-2',
        'min-h-touch active:scale-[0.99]',
      )}
    >
      {/* Dot de prioridad */}
      <div className="flex flex-col items-center pt-1">
        <span
          className={cn(
            'h-2 w-2 rounded-full flex-shrink-0',
            PRIORITY_DOT[order.priority] ?? 'bg-ink-tertiary',
          )}
        />
        <span className="mt-1 w-px flex-1 bg-border-subtle" />
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col gap-2 min-w-0">
        {/* Cliente + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-sans font-medium text-ink-primary leading-tight">
              {order.customer_name ?? '—'}
            </p>
            <p className="truncate text-sm text-ink-secondary mt-0.5">
              {order.site_name}
            </p>
          </div>
          <Badge variant={order.status as Parameters<typeof Badge>[0]['variant']} className="flex-shrink-0" />
        </div>

        {/* Dirección */}
        {order.site_address && (
          <div className="flex items-center gap-1.5 text-sm text-ink-tertiary">
            <MapPin size={13} className="flex-shrink-0" />
            <span className="truncate">{order.site_address}</span>
          </div>
        )}

        {/* Tipo + hora */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-ink-secondary">
            <Wrench size={13} className="flex-shrink-0" />
            <span>{TYPE_LABELS[order.type] ?? order.type}</span>
          </div>
          {order.scheduled_time && (
            <div className="flex items-center gap-1 text-sm font-mono text-ink-secondary">
              <Clock size={13} />
              <span>{order.scheduled_time.slice(0, 5)}</span>
            </div>
          )}
        </div>

        {/* Número de orden */}
        <p className="font-mono text-xs text-ink-tertiary">{order.order_number}</p>
      </div>

      {/* Flecha */}
      <div className="flex items-center self-center text-ink-tertiary transition-colors group-hover:text-volt-500">
        <Zap size={16} />
      </div>
    </Link>
  )
}
