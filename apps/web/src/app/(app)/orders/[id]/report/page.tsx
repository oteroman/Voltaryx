'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter }         from 'next/navigation'
import { ArrowLeft, Download, Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/components/ui/cn'

/* ─── tipos ─────────────────────────────────────────────────────────────── */
interface Asset {
  name: string; brand: string; model: string; serial_number: string
  capacity_kva: number | null; installation_date: string | null
  asset_types?: { name: string; category: string }
  checklist_data: Record<string, unknown>
  completed_at: string | null
}
interface Finding {
  title: string; description: string; severity: string
  category: string; status: string; is_opportunity: boolean
  estimated_value: number | null
}
interface Photo { url: string; caption: string; taken_at: string }
interface Narrative {
  antecedentes: string; pasos_realizados: string[]
  diagnostico: string; observaciones: string
  conclusiones: string; recomendaciones: string[]
}
interface Report {
  order: {
    order_number: string; type: string; scheduled_date: string
    scheduled_time: string; signed_by: string; signed_at: string
    signature_url: string; completion_notes: string
  }
  customer: { name: string; tax_id: string; industry: string } | null
  site: { name: string; address: string; city: string; primary_contact: string; primary_phone: string } | null
  technician: string; supervisor: string
  assets: Asset[]; findings: Finding[]; photos: Photo[]
  narrative: Narrative
}

/* ─── helpers ────────────────────────────────────────────────────────────── */
const ORDER_TYPE_LABEL: Record<string, string> = {
  preventive: 'MANTENIMIENTO PREVENTIVO', corrective: 'MANTENIMIENTO CORRECTIVO',
  emergency: 'SERVICIO DE EMERGENCIA', installation: 'INSTALACIÓN', inspection: 'INSPECCIÓN',
}
const SEVERITY_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
}

function ChecklistTable({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return <p className="text-sm text-gray-400 italic">Sin parámetros registrados</p>
  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} className="border-b border-gray-100">
            <td className="py-1 pr-4 text-gray-600 font-medium capitalize w-1/2">
              {k.replace(/_/g, ' ')}
            </td>
            <td className="py-1 font-mono text-gray-900">
              {typeof v === 'boolean'
                ? v ? '✅ Conforme' : '❌ No conforme'
                : String(v)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ─── página principal ───────────────────────────────────────────────────── */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [report,  setReport]  = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/orders/${id}/report`, { method: 'POST' })
      .then(r => r.json())
      .then(data => { setReport(data); setLoading(false) })
      .catch(() => { setError('No se pudo generar el informe.'); setLoading(false) })
  }, [id])

  function handlePrint() {
    window.print()
  }

  /* ── estados de carga ── */
  if (loading) return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-void px-4">
      <Loader2 size={36} className="animate-spin text-volt-500" />
      <div className="text-center">
        <p className="font-semibold text-ink-primary">Generando informe técnico</p>
        <p className="mt-1 text-sm text-ink-secondary">Analizando datos con IA...</p>
      </div>
    </div>
  )
  if (error || !report) return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-void px-4 text-center">
      <AlertCircle size={36} className="text-critical" />
      <p className="text-ink-primary">{error || 'Informe no disponible'}</p>
      <Link href={`/orders/${id}`} className="text-volt-500 underline">Volver a la orden</Link>
    </div>
  )

  const { order, customer, site, technician, supervisor, assets, findings, photos, narrative } = report
  const reportDate = order.scheduled_date ? formatDate(order.scheduled_date) : ''
  const serviceTitle = ORDER_TYPE_LABEL[order.type] ?? order.type.toUpperCase()

  return (
    <>
      {/* ── Barra de acciones (NO se imprime) ── */}
      <div className="no-print sticky top-0 z-50 flex items-center justify-between border-b border-border-subtle bg-void/95 px-4 py-3 backdrop-blur-sm">
        <Link href={`/orders/${id}`} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-ink-secondary">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm font-medium text-ink-secondary">Vista previa del informe</span>
        <button onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-volt-500 px-4 py-2 text-sm font-semibold text-ink-inverse hover:bg-volt-400 transition-colors">
          <Download size={16} />
          Descargar PDF
        </button>
      </div>

      {/* ── INFORME ── */}
      <div ref={printRef} className="report-body mx-auto max-w-4xl bg-white px-8 py-6 text-gray-900">

        {/* ENCABEZADO */}
        <div className="mb-6 border-b-4 border-yellow-400 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight text-gray-900">VOLTARYX</div>
              <div className="text-xs text-gray-500 font-medium tracking-widest">FIELD SERVICE EXCELLENCE</div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div className="font-bold text-sm text-gray-800 font-mono">{order.order_number}</div>
              <div>{reportDate}</div>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-bold tracking-wide text-yellow-400">
            {serviceTitle}
          </div>
        </div>

        {/* DATOS DEL CLIENTE */}
        <table className="mb-5 w-full border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-900 text-yellow-400">
              <th colSpan={4} className="px-3 py-2 text-left text-xs font-bold tracking-wider">DATOS DEL CLIENTE</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-1.5 font-semibold text-gray-600 w-1/4">EMPRESA</td>
              <td className="px-3 py-1.5 font-medium" colSpan={3}>{customer?.name ?? '—'}</td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="px-3 py-1.5 font-semibold text-gray-600">RUC</td>
              <td className="px-3 py-1.5 font-mono">{customer?.tax_id ?? '—'}</td>
              <td className="px-3 py-1.5 font-semibold text-gray-600">RUBRO</td>
              <td className="px-3 py-1.5">{customer?.industry ?? '—'}</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="px-3 py-1.5 font-semibold text-gray-600">DIRECCIÓN</td>
              <td className="px-3 py-1.5" colSpan={3}>{site?.address ?? '—'}{site?.city ? `, ${site.city}` : ''}</td>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="px-3 py-1.5 font-semibold text-gray-600">SEDE</td>
              <td className="px-3 py-1.5">{site?.name ?? '—'}</td>
              <td className="px-3 py-1.5 font-semibold text-gray-600">CONTACTO</td>
              <td className="px-3 py-1.5">{site?.primary_contact ?? '—'}</td>
            </tr>
            <tr>
              <td className="px-3 py-1.5 font-semibold text-gray-600">TÉCNICO</td>
              <td className="px-3 py-1.5">{technician}</td>
              <td className="px-3 py-1.5 font-semibold text-gray-600">SUPERVISOR</td>
              <td className="px-3 py-1.5">{supervisor}</td>
            </tr>
          </tbody>
        </table>

        {/* ANTECEDENTES */}
        <Section title="1. ANTECEDENTES">
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{narrative.antecedentes}</p>
        </Section>

        {/* ACCIONES REALIZADAS */}
        {narrative.pasos_realizados.length > 0 && (
          <Section title="2. ACCIONES REALIZADAS">
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              {narrative.pasos_realizados.map((paso, i) => (
                <li key={i} className="leading-relaxed">{paso}</li>
              ))}
            </ol>
          </Section>
        )}

        {/* EQUIPOS INTERVENIDOS */}
        {assets.map((asset, idx) => {
          const typeName = (asset.asset_types as { name: string } | undefined)?.name ?? 'Equipo'
          return (
            <Section key={idx} title={`3.${idx + 1} ${typeName.toUpperCase()}: ${asset.name}`}>
              {/* Ficha técnica */}
              <table className="mb-3 w-full border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th colSpan={4} className="px-3 py-1.5 text-left font-bold text-gray-700">CARACTERÍSTICAS DEL EQUIPO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="px-3 py-1 font-semibold text-gray-600 w-1/4">MARCA</td>
                    <td className="px-3 py-1">{asset.brand ?? '—'}</td>
                    <td className="px-3 py-1 font-semibold text-gray-600 w-1/4">MODELO</td>
                    <td className="px-3 py-1">{asset.model ?? '—'}</td>
                  </tr>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td className="px-3 py-1 font-semibold text-gray-600">SERIE</td>
                    <td className="px-3 py-1 font-mono">{asset.serial_number ?? '—'}</td>
                    <td className="px-3 py-1 font-semibold text-gray-600">POTENCIA</td>
                    <td className="px-3 py-1">{asset.capacity_kva ? `${asset.capacity_kva} kVA` : '—'}</td>
                  </tr>
                  {asset.installation_date && (
                    <tr className="border-t border-gray-200">
                      <td className="px-3 py-1 font-semibold text-gray-600">INSTALACIÓN</td>
                      <td className="px-3 py-1" colSpan={3}>
                        {new Date(asset.installation_date).toLocaleDateString('es-PE')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Parámetros medidos */}
              <div className="border border-gray-300 rounded">
                <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 border-b border-gray-300">
                  REGISTRO DE PARÁMETROS MEDIDOS
                </div>
                <div className="px-3 py-2">
                  <ChecklistTable data={asset.checklist_data} />
                </div>
              </div>
            </Section>
          )
        })}

        {/* HALLAZGOS */}
        {findings.length > 0 && (
          <Section title={`4. HALLAZGOS (${findings.length})`}>
            <div className="flex flex-col gap-2">
              {findings.map((f, i) => (
                <div key={i} className={cn('rounded border p-3',
                  f.severity === 'critical' ? 'border-red-200 bg-red-50' :
                  f.severity === 'high'     ? 'border-orange-200 bg-orange-50' :
                  f.severity === 'medium'   ? 'border-yellow-200 bg-yellow-50' :
                                              'border-green-200 bg-green-50')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{SEVERITY_ICON[f.severity as keyof typeof SEVERITY_ICON] ?? '⚪'}</span>
                    <span className="text-sm font-bold text-gray-900">{f.title}</span>
                    <span className="ml-auto text-xs text-gray-500 capitalize">{f.category}</span>
                  </div>
                  {f.description && <p className="text-xs text-gray-700 leading-relaxed">{f.description}</p>}
                  {f.is_opportunity && f.estimated_value && (
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      💼 Oportunidad de venta estimada: S/ {f.estimated_value.toLocaleString('es-PE')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* DIAGNÓSTICO */}
        <Section title="5. DIAGNÓSTICO DEL EQUIPO">
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{narrative.diagnostico}</p>
        </Section>

        {/* OBSERVACIONES */}
        {narrative.observaciones && (
          <Section title="6. OBSERVACIONES">
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{narrative.observaciones}</p>
          </Section>
        )}

        {/* FOTOS */}
        {photos.length > 0 && (
          <Section title="7. REGISTRO FOTOGRÁFICO">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption} className="w-full rounded border border-gray-200 object-cover aspect-video" />
                  {p.caption && <p className="text-center text-xs text-gray-500">{p.caption}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* CONCLUSIONES */}
        <Section title="8. CONCLUSIONES">
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{narrative.conclusiones}</p>
          {order.completion_notes && (
            <p className="mt-2 text-sm text-gray-700 italic border-l-2 border-yellow-400 pl-3">
              {order.completion_notes}
            </p>
          )}
        </Section>

        {/* RECOMENDACIONES */}
        {narrative.recomendaciones.length > 0 && (
          <Section title="9. RECOMENDACIONES">
            <ul className="space-y-1.5 text-sm text-gray-700">
              {narrative.recomendaciones.map((rec, i) => (
                <li key={i} className="flex gap-2">
                  <span className="flex-shrink-0 text-yellow-500 font-bold">{i + 1}.</span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* FIRMA */}
        <Section title="10. CONFORMIDAD Y FIRMA">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            {/* Firma del cliente */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Firma de conformidad del cliente
              </p>
              {order.signature_url ? (
                <div className="border border-gray-300 rounded-lg bg-white p-2 flex flex-col items-center gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={order.signature_url} alt="Firma del cliente" className="h-24 w-full object-contain" />
                  <div className="text-center">
                    <p className="text-xs font-semibold text-gray-900">{order.signed_by}</p>
                    {order.signed_at && (
                      <p className="text-xs text-gray-500">{formatDate(order.signed_at)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-28 items-end justify-center border border-dashed border-gray-300 rounded-lg">
                  <div className="border-t border-gray-400 w-48 mb-4 text-center">
                    <p className="text-xs text-gray-500 mt-1">{site?.primary_contact ?? 'Cliente'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sello empresa */}
            <div className="flex-1">
              <p className="mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Técnico responsable
              </p>
              <div className="flex h-28 flex-col items-center justify-end border border-dashed border-gray-300 rounded-lg pb-3">
                <div className="border-t border-gray-400 w-48 text-center">
                  <p className="text-xs font-semibold text-gray-900 mt-1">{technician}</p>
                  <p className="text-xs text-gray-500">TÉCNICO RESPONSABLE</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* FOOTER */}
        <div className="mt-8 border-t-2 border-yellow-400 pt-4 text-center">
          <p className="text-xs font-bold text-gray-900 tracking-widest">VOLTARYX — FIELD SERVICE EXCELLENCE</p>
          <p className="text-xs text-gray-400">
            Informe generado el {new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}{order.order_number}
          </p>
        </div>
      </div>

      {/* CSS de impresión */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-body {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 15mm 12mm; size: A4; }
        }
        @media screen {
          .report-body { box-shadow: 0 4px 24px rgba(0,0,0,0.15); margin: 16px auto; border-radius: 8px; }
        }
      `}</style>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 border-l-4 border-yellow-400 pl-3 text-sm font-bold uppercase tracking-wider text-gray-900">
        {title}
      </h2>
      {children}
    </div>
  )
}
