import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_STAGES = ['identified', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export default async function AdvanceOpportunityPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { stage?: string }
}) {
  const stage = searchParams.stage
  if (!stage || !VALID_STAGES.includes(stage)) redirect('/opportunities')

  const supabase = createClient()
  await supabase.from('opportunities').update({ stage }).eq('id', params.id)

  redirect('/opportunities')
}
