import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function makePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'Maf-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function getAdminProfile() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('role, tenant_id, full_name').eq('id', user.id).single()
  if (!data || data.role !== 'tenant_admin') return null
  return { ...data, id: user.id }
}

/* ── POST: dar acceso al portal ─────────────────────────────────────────── */
export async function POST(req: Request) {
  const admin = await getAdminProfile()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { email, fullName, customerId } = await req.json() as {
    email: string; fullName: string; customerId: string
  }

  if (!email || !fullName || !customerId)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const sb = adminClient()
  const tempPassword = makePassword()

  // Create auth user
  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr)
    return NextResponse.json({ error: createErr.message }, { status: 400 })

  // Insert profile (bypasses RLS via service role)
  const { error: profileErr } = await sb.from('profiles').insert({
    id:          created.user.id,
    role:        'client',
    customer_id: customerId,
    tenant_id:   admin.tenant_id,
    full_name:   fullName,
    email,
    updated_at:  new Date().toISOString(),
  })

  if (profileErr) {
    await sb.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ tempPassword, userId: created.user.id })
}

/* ── DELETE: revocar acceso ─────────────────────────────────────────────── */
export async function DELETE(req: Request) {
  const admin = await getAdminProfile()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { userId } = await req.json() as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const sb = adminClient()
  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
