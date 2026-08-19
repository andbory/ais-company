import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculateSettlementEffects } from '../server/settlements/settlement.effects.ts'
import { validateSettlementInput } from '../server/settlements/settlement.validation.ts'

const partyId = '123e4567-e89b-12d3-a456-426614174000'
const valid = { partyId, date: '2026-08-19', currency: 'USD', amount: '30.00', direction: 'THEY_PAID_US' }

test('validates settlement inputs', () => {
  assert.equal(validateSettlementInput(valid).amount, '30.00')
  assert.equal(validateSettlementInput({ ...valid, direction: 'WE_PAID_THEM' }).direction, 'WE_PAID_THEM')
})

test('rejects invalid settlement data', () => {
  assert.throws(() => validateSettlementInput({ ...valid, amount: '0' }), /أكبر من صفر/)
  assert.throws(() => validateSettlementInput({ ...valid, currency: 'GBP' }), /عملة/)
  assert.throws(() => validateSettlementInput({ ...valid, direction: 'UNKNOWN' }), /اتجاه/)
  assert.throws(() => validateSettlementInput({ ...valid, notes: 'x'.repeat(2001) }), /ملاحظات/)
})

test('consumes what the party owes AIS', () => {
  assert.deepEqual(calculateSettlementEffects(10000n, 5000n, 3000n, 'THEY_PAID_US'), [{ direction: 'WE_ARE_OWED', amountCents: 3000n }])
})

test('over-settlement reverses the remaining amount', () => {
  assert.deepEqual(calculateSettlementEffects(10000n, 0n, 13000n, 'THEY_PAID_US'), [
    { direction: 'WE_ARE_OWED', amountCents: 10000n }, { direction: 'THEY_ARE_OWED', amountCents: 3000n },
  ])
  assert.deepEqual(calculateSettlementEffects(0n, 5000n, 7000n, 'WE_PAID_THEM'), [
    { direction: 'THEY_ARE_OWED', amountCents: 5000n }, { direction: 'WE_ARE_OWED', amountCents: 2000n },
  ])
})

test('a settlement with no balance creates only the opposite direction effect', () => {
  assert.deepEqual(calculateSettlementEffects(0n, 0n, 1000n, 'THEY_PAID_US'), [{ direction: 'THEY_ARE_OWED', amountCents: 1000n }])
})
