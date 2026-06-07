import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const GEMINI_MODEL   = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!

const EXTRACT_PROMPT = `You are a technical specialist for power equipment (UPS, voltage stabilizers, battery banks).
Analyze this product datasheet and extract the following information as JSON.

Return ONLY valid JSON with these exact keys (use null for fields not found):
{
  "category": "ups" | "battery_bank" | "module" | "cooling" | "ats" | "software" | "accessory" | "other",
  "description": "Full product name (model + main spec)",
  "brand": "Manufacturer brand name",
  "model": "Model number/code",
  "power_kva": number or null (rated power in kVA),
  "phase": "monofasico" | "trifasico" | null,
  "voltage_input": "Input voltage spec (e.g. 220V, 380V)",
  "voltage_output": "Output voltage spec",
  "frequency": "Frequency spec (e.g. 50/60Hz)",
  "efficiency_pct": number or null (efficiency percentage),
  "dimensions": "WxDxH in mm if available",
  "weight_kg": number or null
}

Rules:
- For category: UPS → "ups", batteries/accumulators → "battery_bank", power modules → "module", cooling/AC → "cooling", ATS/transfer switch → "ats"
- For description: combine brand + model + key spec (e.g. "UPS Online Liebert APM 30 kVA Trifásico")
- For phase: single-phase → "monofasico", three-phase → "trifasico"
- Extract numbers only for numeric fields (no units)
`

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

    const mimeType = file.type || 'application/pdf'
    const allowed  = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, JPG, PNG, or WEBP.' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const sb      = createClient(SUPABASE_URL, SERVICE_KEY)
    const ext     = file.name.split('.').pop() ?? 'pdf'
    const path    = `datasheets/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const buffer  = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await sb.storage
      .from('product-files')
      .upload(path, buffer, { contentType: mimeType, upsert: false })

    if (uploadErr) throw new Error('Storage upload failed: ' + uploadErr.message)

    const { data: { publicUrl } } = sb.storage.from('product-files').getPublicUrl(path)

    // Call Gemini vision API
    const b64     = buffer.toString('base64')
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: EXTRACT_PROMPT },
              { inline_data: { mime_type: mimeType, data: b64 } },
            ],
          }],
          generationConfig: {
            temperature:      0.1,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      throw new Error('Gemini API error: ' + errText)
    }

    const geminiData = await geminiRes.json()
    const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'

    let extracted: Record<string, unknown> = {}
    try { extracted = JSON.parse(rawText) } catch { /* leave empty */ }

    return NextResponse.json({ datasheet_url: publicUrl, extracted })
  } catch (err) {
    console.error('[parse-datasheet]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
