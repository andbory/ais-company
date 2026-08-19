import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validatePartyInput, validatePartySearch } from '../server/parties/party.validation.ts'

test('validates a person and normalizes text', () => {
  assert.deepEqual(validatePartyInput({ type: 'PERSON', name: '  علي  ', phone: ' 0770 ' }), {
    type: 'PERSON', name: 'علي', phone: '0770', address: null, country: null, notes: null,
  })
})

test('keeps type-specific profile fields only for their type', () => {
  assert.equal(validatePartyInput({ type: 'OFFICE', name: 'مكتب بغداد', ownerName: 'أحمد', responsibleName: 'ignored' }).ownerName, 'أحمد')
  assert.equal(validatePartyInput({ type: 'OFFICE', name: 'مكتب بغداد', ownerName: 'أحمد', responsibleName: 'ignored' }).responsibleName, undefined)
  assert.equal(validatePartyInput({ type: 'COMPANY', name: 'شركة AIS', responsibleName: 'سارة' }).responsibleName, 'سارة')
})

test('rejects invalid types, missing names, and oversized fields', () => {
  assert.throws(() => validatePartyInput({ type: 'BANK', name: 'X' }), /نوع الجهة/)
  assert.throws(() => validatePartyInput({ type: 'PERSON', name: ' ' }), /اسم الجهة/)
  assert.throws(() => validatePartyInput({ type: 'PERSON', name: 'X', notes: 'x'.repeat(2001) }), /notes/)
})

test('validates and normalizes search terms', () => {
  assert.equal(validatePartySearch('  بغداد  '), 'بغداد')
  assert.equal(validatePartySearch(undefined), '')
  assert.throws(() => validatePartySearch('x'.repeat(201)), /البحث/)
})
