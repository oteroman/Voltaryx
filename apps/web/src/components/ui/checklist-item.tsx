'use client'

import { useState } from 'react'
import { Camera, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/components/ui/cn'

export interface ChecklistField {
  key:     string
  label:   string
  type:    'boolean' | 'number' | 'text' | 'select'
  unit?:   string
  min?:    number
  max?:    number
  options?: string[]
  required?: boolean
}

interface ChecklistItemProps {
  field:       ChecklistField
  value:       unknown
  onChange:    (key: string, value: unknown) => void
  onAddPhoto?: (key: string) => void
  photoCount?: number
}

export function ChecklistItem({
  field, value, onChange, onAddPhoto, photoCount = 0,
}: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false)
  const isComplete = value !== null && value !== undefined && value !== ''

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isComplete ? 'border-volt-500/20 bg-surface-1' : 'border-border-subtle bg-surface-1',
    )}>
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="flex w-full items-center gap-3 px-4 py-3 min-h-[44px]"
      >
        <span className={cn(
          'flex-shrink-0 transition-colors',
          isComplete ? 'text-volt-500' : 'text-ink-tertiary',
        )}>
          {isComplete ? <CheckCircle2 size={18} /> : <Circle size={18} />}
        </span>
        <span className="flex-1 text-left text-sm font-medium text-ink-primary">
          {field.label}
          {field.required && <span className="ml-1 text-critical">*</span>}
        </span>
        {field.unit && (
          <span className="font-mono text-xs text-ink-tertiary">{field.unit}</span>
        )}
        {expanded ? (
          <ChevronUp size={14} className="text-ink-tertiary" />
        ) : (
          <ChevronDown size={14} className="text-ink-tertiary" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border-subtle px-4 py-3">
          {field.type === 'boolean' && (
            <div className="flex gap-3">
              {['OK', 'Falla', 'N/A'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(field.key, opt)}
                  className={cn(
                    'flex-1 rounded-md py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                    value === opt
                      ? opt === 'OK'
                        ? 'bg-success/20 text-success ring-1 ring-success/50'
                        : opt === 'Falla'
                        ? 'bg-critical/20 text-critical ring-1 ring-critical/50'
                        : 'bg-surface-3 text-ink-secondary ring-1 ring-border-subtle'
                      : 'bg-surface-2 text-ink-tertiary hover:text-ink-secondary',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {field.type === 'number' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={value as number | '' ?? ''}
                min={field.min}
                max={field.max}
                onChange={e => onChange(field.key, e.target.value === '' ? null : Number(e.target.value))}
                className="flex-1 rounded-md border border-border-subtle bg-surface-2 px-3 py-2 font-mono text-base text-ink-primary focus:border-volt-500 focus:outline-none"
                placeholder="0"
              />
              {field.unit && (
                <span className="font-mono text-sm text-ink-tertiary">{field.unit}</span>
              )}
            </div>
          )}

          {field.type === 'text' && (
            <textarea
              value={value as string ?? ''}
              onChange={e => onChange(field.key, e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-ink-primary placeholder-ink-tertiary focus:border-volt-500 focus:outline-none resize-none"
              placeholder="Observación..."
            />
          )}

          {field.type === 'select' && field.options && (
            <div className="flex flex-col gap-2">
              {field.options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange(field.key, opt)}
                  className={cn(
                    'rounded-md px-4 py-2.5 text-left text-sm font-medium transition-colors min-h-[44px]',
                    value === opt
                      ? 'bg-volt-100 text-volt-500 ring-1 ring-volt-500/30'
                      : 'bg-surface-2 text-ink-secondary hover:text-ink-primary',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {onAddPhoto && (
            <button
              type="button"
              onClick={() => onAddPhoto(field.key)}
              className="mt-3 flex w-full items-center gap-2 rounded-md border border-dashed border-border-subtle px-3 py-2.5 text-sm text-ink-tertiary hover:border-volt-500/30 hover:text-ink-secondary min-h-[44px]"
            >
              <Camera size={14} />
              {photoCount > 0 ? `${photoCount} foto(s) · Agregar más` : 'Agregar foto'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
