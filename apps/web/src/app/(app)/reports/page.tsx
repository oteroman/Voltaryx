import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2">
        <BarChart3 size={32} className="text-ink-tertiary" />
      </div>
      <div>
        <h1 className="font-display text-xl font-bold text-ink-primary">Reportes</h1>
        <p className="mt-2 text-sm text-ink-tertiary">
          Dashboard de métricas y reportes — próximamente
        </p>
      </div>
    </div>
  )
}
