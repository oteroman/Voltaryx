import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function adminSb() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (data?.role !== 'tenant_admin') return null
  return { userId: user.id, tenantId: (data as any).tenant_id as string }
}

function tempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz'
  return 'Maf-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* ── POST: Invitar usuario ───────────────────────────────────────────────── */
export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { email, fullName, role } = await req.json() as {
    email: string; fullName: string; role: string
  }

  const VALID_ROLES = ['technician', 'supervisor', 'commercial', 'tenant_admin']
  if (!email || !fullName || !VALID_ROLES.includes(role))
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const sb  = adminSb()
  const pwd = tempPassword()

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    password: pwd,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

  const { error: profErr } = await sb.from('profiles').insert({
    id:         created.user.id,
    role,
    tenant_id:  admin.tenantId,
    full_name:  fullName,
    email,
    updated_at: new Date().toISOString(),
  })

  if (profErr) {
    await sb.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  return NextResponse.json({ tempPassword: pwd, userId: created.user.id })
}

/* ── DELETE: Desactivar usuario ─────────────────────────────────────────── */
export async function DELETE(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { userId } = await req.json() as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  // Prevent self-deletion
  if (userId === admin.userId)
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })

  const sb = adminSb()
  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
