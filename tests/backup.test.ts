import assert from 'node:assert/strict'
import { test } from 'node:test'
import { backupFilePath, validateRetentionDays } from '../server/backup/backup.validation.ts'

test('creates a confined backup file path', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000'
  const file = backupFilePath('C:\\AIS\\backups', id)
  assert.equal(file.endsWith(`ais-backup-${id}.dump`), true)
})

test('rejects invalid backup identifiers and retention', () => {
  assert.throws(() => backupFilePath('C:\\AIS\\backups', '../bad'), /معرّف/)
  assert.equal(validateRetentionDays(undefined), 30)
  assert.equal(validateRetentionDays('365'), 365)
  assert.throws(() => validateRetentionDays('0'), /الاحتفاظ/)
})
