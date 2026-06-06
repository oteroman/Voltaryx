import { cn } from './cn'

type Variant = 'scheduled' | 'in_transit' | 'on_site' | 'in_progress' | 'completed' | 'approved' | 'cancelled'
  | 'critical' | 'high' | 'normal' | 'low'

const VARIANTS: Record<Variant, string> = {
  scheduled:   'bg-surface-3 text-ink-secondary',
  in_transit:  'bg-info/10 text-info',
  on_site:     'bg-volt-100 text-volt-500',
  in_progress: 'bg-volt-100 text-volt-500',
  completed:   'bg-success/10 text-success',
  approved:    'bg-success/10 text-success',
  cancelled:   'bg-critical/10 text-critical',
  critical:    'bg-critical/10 text-critical',
  high:        'bg-warning/10 text-warning',
  normal:      'bg-surface-3 text-ink-secondary',
  low:         'bg-surface-3 text-ink-tertiary',
}

const LABELS: Record<Variant, string> = {
  scheduled:   'Programada',
  in_transit:  'En camino',
  on_site:     'En sitio',
  in_progress: 'En progreso',
  completed:   'Completada',
  approved:    'Aprobada',
  cancelled:   'Cancelada',
  critical:    'Crítica',
  high:        'Alta',
  normal:      'Normal',
  low:         'Baja',
}

interface BadgeProps {
  variant: Variant
  label?: string
  className?: string
}

export function Badge({ variant, label, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-sans font-medium',
        VARIANTS[variant],
        className,
      )}
    >
      {label ?? LABELS[variant]}
    </span>
  )
}
