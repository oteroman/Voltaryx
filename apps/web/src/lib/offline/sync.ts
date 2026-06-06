'use client'

import { db, nextRetryDelay, type SyncQueueItem } from './db'
import { createClient } from '@/lib/supabase/client'

let syncing = false

export async function processSyncQueue() {
  if (syncing || !navigator.onLine) return
  syncing = true

  try {
    const supabase = createClient()
    const now = new Date().toISOString()

    const pending = await db.syncQueue
      .where('nextRetryAt')
      .belowOrEqual(now)
      .and((item) => item.attempts < item.maxAttempts)
      .sortBy('createdAt')

    for (const item of pending) {
      try {
        await processItem(supabase, item)
        await db.syncQueue.delete(item.id!)
      } catch (err) {
        const newAttempts = item.attempts + 1
        await db.syncQueue.update(item.id!, {
          attempts:    newAttempts,
          nextRetryAt: nextRetryDelay(newAttempts),
          lastError:   err instanceof Error ? err.message : String(err),
        })
      }
    }
  } finally {
    syncing = false
  }
}

async function processItem(supabase: ReturnType<typeof createClient>, item: SyncQueueItem) {
  switch (item.entityType) {
    case 'work_order': {
      const wo = await db.workOrders.get(item.entityLocalId)
      if (!wo) return
      const payload: Record<string, unknown> = item.payload ? JSON.parse(item.payload) : {}

      if (item.action === 'update') {
        const { error } = await supabase
          .from('work_orders')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(payload as any)
          .eq('id', wo.remoteId)
        if (error) throw new Error(error.message)
        await db.workOrders.update(item.entityLocalId, { syncStatus: 'synced', syncedAt: new Date().toISOString() })
      }
      break
    }

    case 'work_order_asset': {
      const woa = await db.workOrderAssets.get(item.entityLocalId)
      if (!woa || !woa.remoteId) return
      const { error } = await supabase
        .from('work_order_assets')
        .update({
          checklist_data: woa.checklistData as Record<string, unknown>,
          completed_at:   woa.completedAt ?? null,
        })
        .eq('id', woa.remoteId)
      if (error) throw new Error(error.message)
      await db.workOrderAssets.update(item.entityLocalId, { syncStatus: 'synced' })
      break
    }

    case 'photo': {
      const photo = await db.photos.get(item.entityLocalId)
      if (!photo) return

      const fileName    = `${photo.workOrderRemoteId}/${Date.now()}.jpg`
      const storagePath = `photos/${fileName}`

      await db.photos.update(item.entityLocalId, { syncStatus: 'uploading' })

      const { error: uploadError } = await supabase.storage
        .from('work-order-files')
        .upload(storagePath, photo.blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw new Error(uploadError.message)

      const { error: dbError } = await supabase.from('photos').insert({
        work_order_id: photo.workOrderRemoteId,
        asset_id:      photo.assetId ?? null,
        storage_path:  storagePath,
        caption:       photo.caption ?? null,
        taken_at:      photo.takenAt,
      })

      if (dbError) throw new Error(dbError.message)
      await db.photos.update(item.entityLocalId, { syncStatus: 'synced', storagePath })
      break
    }

    case 'signature': {
      const sig = await db.signatures.get(item.entityLocalId)
      if (!sig) return

      const blob        = await fetch(sig.dataUrl).then((r) => r.blob())
      const storagePath = `signatures/${sig.workOrderRemoteId}/signature.png`

      await db.signatures.update(item.entityLocalId, { syncStatus: 'uploading' })

      const { error: uploadError } = await supabase.storage
        .from('work-order-files')
        .upload(storagePath, blob, { contentType: 'image/png', upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { error: dbError } = await supabase
        .from('work_orders')
        .update({
          signature_url: storagePath,
          signed_by:     sig.signatoryName,
          signed_at:     sig.signedAt,
          status:        'completed',
          completed_at:  sig.signedAt,
        })
        .eq('id', sig.workOrderRemoteId)

      if (dbError) throw new Error(dbError.message)
      await db.signatures.update(item.entityLocalId, { syncStatus: 'synced', storagePath })
      break
    }

    case 'finding': {
      const finding = await db.findings.get(item.entityLocalId)
      if (!finding) return
      const { error } = await supabase.from('findings').insert({
        work_order_id: finding.workOrderRemoteId,
        asset_id:      finding.assetId ?? null,
        severity:      finding.severity === 'major' ? 'high' :
                       finding.severity === 'minor' ? 'low' :
                       finding.severity === 'informational' ? 'low' : finding.severity,
        category:      finding.category as 'electrical' | 'mechanical' | 'thermal' | 'physical' | 'software' | 'other' | null ?? null,
        title:         finding.title,
        description:   finding.description ?? null,
        status:        'open',
        is_opportunity: false,
      })
      if (error) throw new Error(error.message)
      await db.findings.update(item.entityLocalId, { syncStatus: 'synced' })
      break
    }
  }
}

export function initSyncListeners() {
  if (typeof window === 'undefined') return

  window.addEventListener('online', () => {
    setTimeout(processSyncQueue, 1000)
  })

  if (navigator.onLine) {
    setTimeout(processSyncQueue, 2000)
  }

  setInterval(() => {
    if (navigator.onLine) processSyncQueue()
  }, 30_000)
}
