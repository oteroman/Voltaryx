'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ChecklistItem, type ChecklistField } from '@/components/ui/checklist-item'
import { PhotoCapture } from '@/components/ui/photo-capture'
import { db } from '@/lib/offline/db'
import { enqueueSync } from '@/lib/offline/db'

interface Params { id: string; woaId: string }

const DEFAULT_CHECKLIST: ChecklistField[] = [
  { key: 'visual_inspection',  label: 'Inspección visual',       type: 'boolean', required: true },
  { key: 'input_voltage_l1',   label: 'Tensión entrada L1',      type: 'number',  unit: 'V',  min: 0, max: 500 },
  { key: 'input_voltage_l2',   label: 'Tensión entrada L2',      type: 'number',  unit: 'V',  min: 0, max: 500 },
  { key: 'input_voltage_l3',   label: 'Tensión entrada L3',      type: 'number',  unit: 'V',  min: 0, max: 500 },
  { key: 'output_voltage',     label: 'Tensión salida',          type: 'number',  unit: 'V',  min: 0, max: 500 },
  { key: 'load_percentage',    label: 'Porcentaje de carga',     type: 'number',  unit: '%',  min: 0, max: 100 },
  { key: 'battery_voltage',    label: 'Tensión baterías',        type: 'number',  unit: 'V' },
  { key: 'battery_temp',       label: 'Temperatura baterías',    type: 'number',  unit: '°C' },
  { key: 'fan_condition',      label: 'Estado ventiladores',     type: 'boolean', required: true },
  { key: 'filter_condition',   label: 'Estado filtros',          type: 'select',  options: ['Limpio','Sucio','Reemplazado'] },
  { key: 'alarms_present',     label: '¿Alarmas activas?',       type: 'boolean' },
  { key: 'observations',       label: 'Observaciones adicionales', type: 'text' },
]

export default function AssetChecklistPage({ params }: { params: Params }) {
  const router    = useRouter()
  const [isPending, startTransition] = useTransition()
  const [woaData,   setWoaData]   = useState<{ asset: { brand?: string | null; model?: string | null; serial_number?: string | null } | null } | null>(null)
  const [checklist, setChecklist] = useState<ChecklistField[]>(DEFAULT_CHECKLIST)
  const [values,    setValues]    = useState<Record<string, unknown>>({})
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('work_order_assets')
      .select('checklist_data, assets ( brand, model, serial_number ), work_orders ( work_order_assets:work_order_assets ( asset_id, assets ( asset_types:asset_type_id ( checklist ) ) ) )')
      .eq('id', params.woaId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setWoaData({ asset: (data.assets as { brand?: string | null; model?: string | null; serial_number?: string | null }) ?? null })
        if (data.checklist_data && typeof data.checklist_data === 'object') {
          setValues(data.checklist_data as Record<string, unknown>)
        }
      })
  }, [params.woaId])

  function handleChange(key: string, value: unknown) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const requiredFields    = checklist.filter(f => f.required)
  const requiredComplete  = requiredFields.every(f => values[f.key] !== undefined && values[f.key] !== null && values[f.key] !== '')
  const totalFilled       = Object.values(values).filter(v => v !== null && v !== undefined && v !== '').length

  async function handleSave(complete: boolean) {
    setSaving(true)
    const supabase = createClient()
    const payload: Record<string, unknown> = { checklist_data: values }
    if (complete) payload.completed_at = new Date().toISOString()

    const { error } = await supabase
      .from('work_order_assets')
      .update(payload)
      .eq('id', params.woaId)

    if (error) {
      // offline: queue locally
      const existing = await db.workOrderAssets.where('remoteId').equals(params.woaId).first()
      if (existing?.localId) {
        await db.workOrderAssets.update(existing.localId, {
          checklistData: values,
          completedAt:   complete ? new Date().toISOString() : undefined,
          syncStatus:    'pending',
        })
        await enqueueSync('work_order_asset', existing.localId, 'UPDATE')
      }
    }

    setSaving(false)
    if (complete) {
      startTransition(() => router.push(`/orders/${params.id}/execute`))
    }
  }

  const asset = woaData?.asset

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border-subtle bg-void/90 px-4 py-3 backdrop-blur-sm">
        <Link
          href={`/orders/${params.id}/execute`}
          className="flex h-touch w-touch items-center justify-center rounded text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="truncate text-base font-medium text-ink-primary">
            {asset ? `${asset.brand ?? ''} ${asset.model ?? ''}`.trim() || 'Equipo' : 'Equipo'}
          </p>
          {asset?.serial_number && (
            <p className="font-mono text-xs text-ink-tertiary">SN: {asset.serial_number}</p>
          )}
        </div>
        <span className="font-mono text-xs text-ink-tertiary">
          {totalFilled}/{checklist.length}
        </span>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {checklist.map(field => (
          <ChecklistItem
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={handleChange}
          />
        ))}

        <div className="mt-2 flex flex-col gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-ink-tertiary">
            Evidencia fotográfica
          </h3>
          <PhotoCapture
            workOrderRemoteId={params.id}
            assetId={params.woaId}
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 pb-8">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex h-touch w-full items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-2 text-base font-medium text-ink-secondary hover:text-ink-primary disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Guardar borrador
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || !requiredComplete || isPending}
            className="flex h-touch w-full items-center justify-center gap-2 rounded-lg bg-volt-500 text-base font-semibold text-ink-inverse transition-colors hover:bg-volt-400 active:bg-volt-600 disabled:opacity-50"
          >
            {saving || isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            Marcar equipo como completado
          </button>
          {!requiredComplete && (
            <p className="text-center text-xs text-ink-tertiary">
              Completa los campos obligatorios (*) para continuar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
