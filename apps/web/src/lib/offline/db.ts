import Dexie, { type Table } from 'dexie'

// ─── Tipos locales ────────────────────────────────────────────
export interface LocalWorkOrder {
  localId?:      number
  remoteId:      string
  tenantId:      string
  orderNumber:   string
  customerName:  string
  siteName:      string
  siteAddress?:  string
  accessNotes?:  string
  type:          string
  status:        string
  priority:      string
  scheduledDate: string
  scheduledTime?: string
  assignedTo:    string
  checklistData?: Record<string, unknown>
  parameters?:   Record<string, unknown>
  notes?:        string
  syncStatus:    'synced' | 'pending' | 'uploading' | 'error'
  syncedAt?:     string
  updatedAt:     string
}

export interface LocalWorkOrderAsset {
  localId?:           number
  remoteId?:          string
  workOrderRemoteId:  string
  assetId:            string
  assetName:          string
  assetSerial?:       string
  checklistData?:     Record<string, unknown>
  parameters?:        Record<string, unknown>
  condition?:         string
  notes?:             string
  completedAt?:       string
  syncStatus:         'synced' | 'pending' | 'error'
}

export interface LocalPhoto {
  localId?:          number
  remoteId?:         string
  workOrderRemoteId: string
  assetId?:          string
  checklistItemId?:  string
  blob:              Blob
  thumbnailBlob?:    Blob
  caption?:          string
  takenAt:           string
  syncStatus:        'synced' | 'pending' | 'uploading' | 'error'
  storagePath?:      string
}

export interface LocalFinding {
  localId?:          number
  remoteId?:         string
  workOrderRemoteId: string
  assetId?:          string
  severity:          'critical' | 'major' | 'minor' | 'informational'
  category?:         string
  title:             string
  description:       string
  recommendation?:   string
  urgency:           string
  syncStatus:        'synced' | 'pending' | 'error'
}

export interface LocalSignature {
  localId?:          number
  workOrderRemoteId: string
  dataUrl:           string
  signatoryName:     string
  signatoryRole?:    string
  signedBy?:         string
  signedAt:          string
  syncStatus:        'synced' | 'pending' | 'uploading' | 'error'
  storagePath?:      string
}

export interface SyncQueueItem {
  id?:          number
  entityType:   'work_order' | 'photo' | 'signature' | 'finding' | 'work_order_asset'
  entityLocalId: number
  remoteId?:    string
  action:       'create' | 'update' | 'upload'
  payload?:     string  // JSON serializado
  attempts:     number
  maxAttempts:  number
  nextRetryAt:  string
  lastError?:   string
  createdAt:    string
}

// ─── Base de datos local Voltaryx ─────────────────────────────
class VoltaryxDB extends Dexie {
  workOrders!:      Table<LocalWorkOrder>
  workOrderAssets!: Table<LocalWorkOrderAsset>
  photos!:          Table<LocalPhoto>
  findings!:        Table<LocalFinding>
  signatures!:      Table<LocalSignature>
  syncQueue!:       Table<SyncQueueItem>

  constructor() {
    super('VoltaryxDB')

    this.version(1).stores({
      workOrders:      '++localId, &remoteId, status, assignedTo, scheduledDate, syncStatus, tenantId',
      workOrderAssets: '++localId, remoteId, workOrderRemoteId, assetId, syncStatus',
      photos:          '++localId, remoteId, workOrderRemoteId, assetId, syncStatus',
      findings:        '++localId, remoteId, workOrderRemoteId, severity, syncStatus',
      signatures:      '++localId, workOrderRemoteId, syncStatus',
      syncQueue:       '++id, entityType, entityLocalId, action, nextRetryAt, attempts',
    })
  }
}

export const db = new VoltaryxDB()

// ─── Helpers de sync queue ────────────────────────────────────
export async function enqueuSync(
  item: Omit<SyncQueueItem, 'id' | 'attempts' | 'nextRetryAt' | 'createdAt'>
) {
  await db.syncQueue.add({
    ...item,
    attempts:    0,
    maxAttempts: 5,
    nextRetryAt: new Date().toISOString(),
    createdAt:   new Date().toISOString(),
  })
}

export function nextRetryDelay(attempts: number): string {
  const delayMs = Math.min(1000 * Math.pow(2, attempts), 30_000)
  return new Date(Date.now() + delayMs).toISOString()
}

// Convenience wrapper for simple enqueue without a full payload object
export async function enqueueSync(
  entityType:    SyncQueueItem['entityType'],
  entityLocalId: number,
  action:        'INSERT' | 'UPDATE' | 'UPLOAD',
) {
  await db.syncQueue.add({
    entityType,
    entityLocalId,
    action:      action === 'INSERT' ? 'create' : action === 'UPDATE' ? 'update' : 'upload',
    attempts:    0,
    maxAttempts: 5,
    nextRetryAt: new Date().toISOString(),
    createdAt:   new Date().toISOString(),
  })
}
