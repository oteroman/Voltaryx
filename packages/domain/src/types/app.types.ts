// ============================================================
// ROLES
// ============================================================
export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'supervisor'
  | 'technician'
  | 'commercial'

// ============================================================
// WORK ORDERS
// ============================================================
export type WorkOrderStatus =
  | 'scheduled'
  | 'in_transit'
  | 'on_site'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'cancelled'

export type WorkOrderType =
  | 'preventive'
  | 'corrective'
  | 'emergency'
  | 'inspection'

export type WorkOrderPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical'

// ============================================================
// ASSETS
// ============================================================
export type AssetCategory =
  | 'ups'
  | 'stabilizer'
  | 'battery_bank'
  | 'precision_ac'
  | 'panel'
  | 'other'

export type AssetStatus =
  | 'operational'
  | 'degraded'
  | 'critical'
  | 'decommissioned'

// ============================================================
// FINDINGS
// ============================================================
export type FindingSeverity =
  | 'critical'
  | 'major'
  | 'minor'
  | 'informational'

export type FindingUrgency =
  | 'immediate'
  | 'urgent'
  | 'scheduled'
  | 'monitoring'

export type FindingStatus =
  | 'open'
  | 'acknowledged'
  | 'resolved'
  | 'deferred'

// ============================================================
// OFFLINE SYNC
// ============================================================
export type SyncStatus =
  | 'synced'
  | 'pending'
  | 'uploading'
  | 'error'

export type SyncAction =
  | 'create'
  | 'update'
  | 'delete'

export interface SyncQueueItem {
  id: string
  entityType: string
  entityId: string
  action: SyncAction
  payload: unknown
  attempts: number
  lastError?: string
  createdAt: string
}

// ============================================================
// CHECKLIST
// ============================================================
export interface ChecklistItem {
  id: string
  label: string
  type: 'boolean' | 'text' | 'number' | 'select' | 'photo'
  required: boolean
  options?: string[]
  unit?: string
  normalRange?: { min: number; max: number }
}

export interface ChecklistResponse {
  itemId: string
  value: boolean | string | number | null
  note?: string
  photoIds?: string[]
  answeredAt: string
}

// ============================================================
// PARÁMETROS TÉCNICOS
// ============================================================
export interface TechnicalParameter {
  id: string
  label: string
  unit: string
  value: number | null
  normalMin?: number
  normalMax?: number
  measuredAt?: string
}
