import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authorize, can, ForbiddenError, permissions } from '../server/auth/authorization.ts'
import { hashPassword, verifyPassword } from '../server/auth/password.ts'

test('password hashes are salted and never equal plaintext', async () => {
  const password = 'correct horse battery staple'
  const first = await hashPassword(password)
  const second = await hashPassword(password)
  assert.notEqual(first, password)
  assert.notEqual(first, second)
  assert.equal(await verifyPassword(password, first), true)
  assert.equal(await verifyPassword('wrong password', first), false)
})

test('weak passwords are rejected', async () => {
  await assert.rejects(() => hashPassword('short'), /8/)
})

test('admin can use all declared permissions', () => {
  for (const permission of permissions) assert.equal(can('ADMIN', permission), true)
})

test('viewer is read-only and cannot mutate or change security state', () => {
  assert.equal(can('VIEWER', 'transfers:read'), true)
  assert.equal(can('VIEWER', 'print:export'), true)
  for (const permission of ['parties:write', 'transfers:write', 'transfers:delete', 'settlements:write', 'settings:write', 'audit:read'] as const) {
    assert.equal(can('VIEWER', permission), false)
    assert.throws(() => authorize('VIEWER', permission), ForbiddenError)
  }
})
