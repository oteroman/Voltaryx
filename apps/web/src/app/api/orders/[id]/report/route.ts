import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { GoogleGenerativeAI }        from '@google/generative-ai'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderId = params.id

  // ── 1. Cargar orden completa ──────────────────────────────────────────────
  const { data: order } = await supabase
    .from('work_orders')
    .select(`
      *,
      customers(name, tax_id, industry),
      sites(name, address, city, primary_contact, primary_phone, access_notes),
      profiles!assigned_to(full_name),
      supervisor:profiles!supervisor_id(full_name)
    `)
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // ── 2. Cargar activos + checklist ─────────────────────────────────────────
  const { data: woAssets } = await supabase
    .from('work_order_assets')
    .select(`
      id, checklist_data, completed_at,
      assets(name, brand, model, serial_number, capacity_kva, status, installation_date,
             asset_types(name, category))
    `)
    .eq('work_order_id', orderId)

  // ── 3. Cargar hallazgos ───────────────────────────────────────────────────
  const { data: findings } = await supabase
    .from('findings')
    .select('title, description, severity, category, status, is_opportunity, estimated_value')
    .eq('work_order_id', orderId)
    .order('severity')

  // ── 4. Cargar fotos ───────────────────────────────────────────────────────
  const { data: photos } = await supabase
    .from('photos')
    .select('storage_path, caption, taken_at')
    .eq('work_order_id', orderId)
    .order('taken_at')

  // Generar URLs públicas de fotos
  const photoUrls = (photos ?? []).map((p) => {
    const { data } = supabase.storage.from('work-order-files').getPublicUrl(p.storage_path)
    return { url: data.publicUrl, caption: p.caption ?? '', taken_at: p.taken_at }
  })

  // ── 5. Construir contexto para Gemini ────────────────────────────────────
  const customer = order.customers as unknown as { name: string; tax_id: string; industry: string } | null
  const site     = order.sites     as unknown as { name: string; address: string; city: string; primary_contact: string; primary_phone: string } | null
  const tech     = order.profiles  as unknown as { full_name: string } | null
  const sup      = order.supervisor as unknown as { full_name: string } | null

  const assetsContext = (woAssets ?? []).map((wa) => {
    const asset = wa.assets as unknown as {
      name: string; brand: string; model: string; serial_number: string
      capacity_kva: number; installation_date: string
      asset_types: { name: string; category: string }
    } | null
    const checklist = wa.checklist_data as Record<string, unknown>
    const checkItems = Object.entries(checklist)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    return `
Equipo: ${asset?.name ?? 'N/A'}
  Tipo: ${asset?.asset_types?.name ?? 'N/A'} | Marca: ${asset?.brand ?? 'N/A'} | Modelo: ${asset?.model ?? 'N/A'}
  Serie: ${asset?.serial_number ?? 'N/A'} | Capacidad: ${asset?.capacity_kva ?? 'N/A'} kVA
  Instalación: ${asset?.installation_date ?? 'N/A'}
  Parámetros medidos: ${checkItems || 'Sin datos'}
  Completado: ${wa.completed_at ? 'Sí' : 'No'}`
  }).join('\n')

  const findingsContext = (findings ?? []).map(f =>
    `[${f.severity.toUpperCase()}] ${f.title}: ${f.description ?? ''}${f.is_opportunity ? ` (Oportunidad: S/ ${f.estimated_value})` : ''}`
  ).join('\n')

  const prompt = `Eres un ingeniero técnico especialista en sistemas UPS, energía ininterrumpida y climatización de precisión con más de 10 años de experiencia en mantenimiento de equipos eléctricos críticos en el Perú.

Genera las secciones narrativas de un informe técnico de mantenimiento basándote EXCLUSIVAMENTE en los datos reales proporcionados a continuación. El lenguaje debe ser técnico, profesional y en español peruano. No inventes datos, úsalos tal como están.

DATOS DEL SERVICIO:
Cliente: ${customer?.name ?? 'N/A'} | RUC: ${customer?.tax_id ?? 'N/A'} | Rubro: ${customer?.industry ?? 'N/A'}
Sede: ${site?.name ?? 'N/A'} — ${site?.address ?? ''}, ${site?.city ?? ''}
Contacto cliente: ${site?.primary_contact ?? 'N/A'}
Tipo de servicio: ${order.type} | Prioridad: ${order.priority}
Fecha: ${order.scheduled_date} ${order.scheduled_time ?? ''}
Técnico: ${tech?.full_name ?? 'N/A'} | Supervisor: ${sup?.full_name ?? 'N/A'}
Descripción original: ${order.description ?? 'Sin descripción'}

EQUIPOS INTERVENIDOS Y PARÁMETROS MEDIDOS:
${assetsContext || 'Sin datos de equipos'}

HALLAZGOS ENCONTRADOS:
${findingsContext || 'Sin hallazgos registrados'}

NOTAS DE FINALIZACIÓN: ${order.completion_notes ?? 'Sin notas adicionales'}

Genera un JSON con exactamente estas claves (sin markdown, solo JSON puro):
{
  "antecedentes": "3-4 párrafos describiendo el contexto, la importancia del equipo para el cliente y las condiciones previas al servicio",
  "pasos_realizados": ["lista de 6-10 pasos técnicos ejecutados durante el servicio"],
  "diagnostico": "2-3 párrafos con el diagnóstico técnico basado en los parámetros medidos y hallazgos",
  "observaciones": "1-2 párrafos con observaciones técnicas relevantes",
  "conclusiones": "2-3 párrafos con conclusiones del servicio",
  "recomendaciones": ["lista de 4-6 recomendaciones técnicas concretas basadas en los hallazgos"]
}`

  let narrative: {
    antecedentes: string
    pasos_realizados: string[]
    diagnostico: string
    observaciones: string
    conclusiones: string
    recomendaciones: string[]
  } = {
    antecedentes: order.description ?? '',
    pasos_realizados: [],
    diagnostico: '',
    observaciones: '',
    conclusiones: 'Servicio completado satisfactoriamente.',
    recomendaciones: [],
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash' })
    const result = await model.generateContent(prompt)
    const text   = result.response.text().trim()
    const clean  = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()
    narrative    = JSON.parse(clean)
  } catch (e) {
    console.error('Gemini error:', e)
    // Usar fallback con datos básicos
  }

  // ── 6. Construir el objeto reporte completo ──────────────────────────────
  const report = {
    order: {
      id: order.id,
      order_number: order.order_number,
      type: order.type,
      priority: order.priority,
      status: order.status,
      scheduled_date: order.scheduled_date,
      scheduled_time: order.scheduled_time,
      description: order.description,
      completion_notes: order.completion_notes,
      signed_by: order.signed_by,
      signed_at: order.signed_at,
      signature_url: order.signature_url,
      completed_at: order.completed_at,
    },
    customer,
    site,
    technician: tech?.full_name ?? '',
    supervisor: sup?.full_name ?? '',
    assets: (woAssets ?? []).map((wa) => ({
      ...(wa.assets as object),
      checklist_data: wa.checklist_data,
      completed_at:   wa.completed_at,
    })),
    findings: findings ?? [],
    photos: photoUrls,
    narrative,
  }

  return NextResponse.json(report)
}
