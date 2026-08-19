import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateCursor, validateSyncBatch, validateSyncMutation } from '../server/sync/sync.validation.ts'

const base = { mutationId: '123e4567-e89b-12d3-a456-426614174000', entityId: '123e4567-e89b-12d3-a456-426614174001', entityType: 'PARTY', operation: 'CREATE_PARTY', payload: { type: 'PERSON', name: 'علي' } }

test('validates a compatible mutation', () => {
  assert.equal(validateSyncMutation(base).operation, 'CREATE_PARTY')
})

test('rejects incompatible, malformed, or oversized mutations', () => {
  assert.throws(() => validateSyncMutation({ ...base, operation: 'CREATE_TRANSFER' }), /متوافقة/)
  assert.throws(() => validateSyncMutation({ ...base, mutationId: 'bad' }), /معرّف المزامنة/)
  assert.throws(() => validateSyncBatch(Array.from({ length: 51 }, () => base)), /50/)
})

test('validates cursors', () => {
  assert.equal(validateCursor(null), null)
  assert.equal(validateCursor('2026-08-19T00:00:00.000Z')?.toISOString(), '2026-08-19T00:00:00.000Z')
  assert.throws(() => validateCursor('not-a-date'), /مؤشر/)
})
