import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateTransferInput } from '../server/transfers/transfer.validation.ts'

const partyId = '123e4567-e89b-12d3-a456-426614174000'
const valid = { partyId, direction: 'SENT', date: '2026-08-19', senderName: 'علي', currency: 'USD', amount: '100.50', commission: '2.50' }

test('validates a transfer and preserves precise decimal strings', () => {
  const result = validateTransferInput(valid)
  assert.equal(result.amount, '100.50')
  assert.equal(result.commission, '2.50')
})

test('accepts sent and received transfers in the five currencies', () => {
  for (const currency of ['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR']) {
    assert.equal(validateTransferInput({ ...valid, currency }).currency, currency)
  }
  assert.equal(validateTransferInput({ ...valid, direction: 'RECEIVED' }).direction, 'RECEIVED')
})

test('rejects invalid identity, date, direction, currency, and money', () => {
  assert.throws(() => validateTransferInput({ ...valid, partyId: 'bad' }), /الجهة/)
  assert.throws(() => validateTransferInput({ ...valid, date: '19-08-2026' }), /تاريخ/)
  assert.throws(() => validateTransferInput({ ...valid, direction: 'UNKNOWN' }), /اتجاه/)
  assert.throws(() => validateTransferInput({ ...valid, currency: 'GBP' }), /عملة/)
  assert.throws(() => validateTransferInput({ ...valid, amount: '0' }), /amount/)
  assert.throws(() => validateTransferInput({ ...valid, commission: '-1' }), /commission/)
  assert.throws(() => validateTransferInput({ ...valid, amount: '1.999' }), /amount/)
})
