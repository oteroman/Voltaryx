'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from './cn'

interface Option {
  value: string
  label: string
  sublabel?: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string) => Promise<Option[]>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Combobox({ value, onChange, onSearch, placeholder, disabled, className }: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!value) { setQuery('') }
  }, [value])

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await onSearch(q)
      setOptions(results)
      setActiveIdx(-1)
      setLoading(false)
    }, 300)
  }, [onSearch])

  function handleInput(q: string) {
    setQuery(q)
    setOpen(true)
    doSearch(q)
  }

  function handleFocus() {
    setOpen(true)
    doSearch(query)
  }

  function handleSelect(opt: Option) {
    onChange(opt.value)
    setQuery(opt.label)
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOptions([])
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, options.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(options[activeIdx]!) }
    if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Buscar...'}
          disabled={disabled}
          className={cn(
            'h-touch w-full rounded-lg bg-surface-2 pl-9 pr-9 text-base text-ink-primary',
            'border border-border outline-none transition-colors placeholder:text-ink-tertiary',
            'focus:border-volt-500 disabled:opacity-50',
          )}
        />
        {value ? (
          <button type="button" onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-primary transition-colors">
            <X size={15} />
          </button>
        ) : (
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border-subtle bg-surface-1 shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink-tertiary">
              <Loader2 size={14} className="animate-spin" />Buscando...
            </div>
          )}
          {!loading && options.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-tertiary">
              {query.length > 0 ? 'Sin resultados' : 'Escribe para buscar...'}
            </p>
          )}
          {!loading && options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={() => handleSelect(opt)}
              className={cn(
                'flex w-full flex-col items-start px-4 py-2.5 text-left transition-colors',
                i === activeIdx || value === opt.value ? 'bg-volt-500/10' : 'hover:bg-surface-2',
              )}
            >
              <span className="text-sm font-medium text-ink-primary">{opt.label}</span>
              {opt.sublabel && <span className="text-xs text-ink-tertiary">{opt.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
