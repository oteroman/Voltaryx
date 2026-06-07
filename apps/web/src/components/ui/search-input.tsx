'use client'

import { Search, X } from 'lucide-react'
import { cn } from './cn'

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder, className }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Buscar...'}
        className="h-10 w-full rounded-lg border border-border-subtle bg-surface-2 pl-9 pr-8 text-sm text-ink-primary placeholder:text-ink-tertiary focus:border-volt-500 focus:outline-none transition-colors"
      />
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
