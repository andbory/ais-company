export type SyncOperation = 'CREATE_PARTY' | 'UPDATE_PARTY' | 'ARCHIVE_PARTY' | 'CREATE_TRANSFER' | 'UPDATE_TRANSFER' | 'ARCHIVE_TRANSFER' | 'CREATE_SETTLEMENT' | 'UPDATE_SETTLEMENT' | 'ARCHIVE_SETTLEMENT'
export type SyncMutationInput = { mutationId: string; entityType: 'PARTY' | 'TRANSFER' | 'SETTLEMENT'; entityId: string; operation: SyncOperation; payload: unknown; expectedVersion?: number | null }

const operations = new Set<SyncOperation>(['CREATE_PARTY', 'UPDATE_PARTY', 'ARCHIVE_PARTY', 'CREATE_TRANSFER', 'UPDATE_TRANSFER', 'ARCHIVE_TRANSFER', 'CREATE_SETTLEMENT', 'UPDATE_SETTLEMENT', 'ARCHIVE_SETTLEMENT'])

export function validateSyncMutation(input: unknown): SyncMutationInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات المزامنة غير صالحة.')
  const value = input as Record<string, unknown>
  if (typeof value.mutationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.mutationId)) throw new Error('معرّف المزامنة غير صالح.')
  if (value.entityType !== 'PARTY' && value.entityType !== 'TRANSFER' && value.entityType !== 'SETTLEMENT') throw new Error('نوع الكيان غير صالح.')
  if (typeof value.entityId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.entityId)) throw new Error('معرّف الكيان غير صالح.')
  if (typeof value.operation !== 'string' || !operations.has(value.operation as SyncOperation) || !value.operation.startsWith(`CREATE_${value.entityType}`) && !value.operation.startsWith(`UPDATE_${value.entityType}`) && !value.operation.startsWith(`ARCHIVE_${value.entityType}`)) throw new Error('عملية المزامنة غير متوافقة مع الكيان.')
  if (value.payload === null || typeof value.payload !== 'object') throw new Error('حمولة المزامنة غير صالحة.')
  if (value.expectedVersion !== undefined && value.expectedVersion !== null && (!Number.isInteger(value.expectedVersion) || Number(value.expectedVersion) < 1)) throw new Error('الإصدار المتوقع غير صالح.')
  return { mutationId: value.mutationId, entityType: value.entityType, entityId: value.entityId, operation: value.operation as SyncOperation, payload: value.payload, expectedVersion: value.expectedVersion as number | null | undefined }
}

export function validateSyncBatch(input: unknown): SyncMutationInput[] {
  if (!Array.isArray(input) || input.length > 50) throw new Error('دفعة المزامنة يجب أن تحتوي على 50 عملية أو أقل.')
  return input.map(validateSyncMutation)
}

export function validateCursor(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('مؤشر المزامنة غير صالح.')
  return date
}
