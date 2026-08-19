import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  applySettlement,
  applyTransfer,
  calculateBalances,
  createEmptyBalances,
  parseMoney,
  totalForTransfer,
  type CurrencyCode,
} from '../src/domain/financial/financial-engine.ts'

const usd = (value: string, allowZero = false) => parseMoney(value, 'USD', { allowZero })
const state = () => createEmptyBalances()

describe('AIS financial engine', () => {
  it('calculates total as amount plus commission without floating point arithmetic', () => {
    assert.deepEqual(totalForTransfer(usd('10000'), usd('50')), usd('10050'))
  })

  it('sent transfer increases what the party owes AIS', () => {
    const result = applyTransfer(state(), { direction: 'SENT', currency: 'USD', amount: usd('10000'), commission: usd('50') })
    assert.deepEqual(result.USD.weAreOwed, usd('10050'))
    assert.deepEqual(result.USD.theyAreOwed, usd('0', true))
  })

  it('received transfer increases what AIS owes the party', () => {
    const result = applyTransfer(state(), { direction: 'RECEIVED', currency: 'USD', amount: usd('2000'), commission: usd('20') })
    assert.deepEqual(result.USD.weAreOwed, usd('0', true))
    assert.deepEqual(result.USD.theyAreOwed, usd('2020'))
  })

  it('partial settlement paid by the party reduces what they owe AIS', () => {
    const result = applySettlement({ USD: { weAreOwed: usd('15050'), theyAreOwed: usd('0', true) } }, { direction: 'THEY_PAID_US', currency: 'USD', amount: usd('3000') })
    assert.deepEqual(result.USD.weAreOwed, usd('12050'))
    assert.deepEqual(result.USD.theyAreOwed, usd('0', true))
  })

  it('over-settlement paid by the party reverses the direction', () => {
    const result = applySettlement({ USD: { weAreOwed: usd('3000'), theyAreOwed: usd('0', true) } }, { direction: 'THEY_PAID_US', currency: 'USD', amount: usd('10000') })
    assert.deepEqual(result.USD.weAreOwed, usd('0', true))
    assert.deepEqual(result.USD.theyAreOwed, usd('7000'))
  })

  it('payment by AIS reduces what AIS owes and reverses excess', () => {
    const result = applySettlement({ USD: { weAreOwed: usd('0', true), theyAreOwed: usd('3000') } }, { direction: 'WE_PAID_THEM', currency: 'USD', amount: usd('10000') })
    assert.deepEqual(result.USD.weAreOwed, usd('7000'))
    assert.deepEqual(result.USD.theyAreOwed, usd('0', true))
  })

  it('keeps currencies isolated', () => {
    const result = applyTransfer(state(), { direction: 'SENT', currency: 'USD', amount: usd('10'), commission: usd('0', true) })
    assert.deepEqual(result.USD.weAreOwed, usd('10'))
    assert.deepEqual(result.IQD.weAreOwed, parseMoney('0', 'IQD', { allowZero: true }))
    assert.deepEqual(result.EUR.weAreOwed, parseMoney('0', 'EUR', { allowZero: true }))
  })

  it('rejects zero, negative, and over-precise amounts', () => {
    assert.throws(() => parseMoney('0', 'USD'))
    assert.throws(() => parseMoney('-1', 'USD'))
    assert.throws(() => parseMoney('1.001', 'USD'))
  })

  it('accepts only the five supported currencies', () => {
    const currencies: CurrencyCode[] = ['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR']
    assert.equal(currencies.map((currency) => parseMoney('1', currency)).length, 5)
  })

  it('replays opening balance, transfer, and settlement into a traceable current balance', () => {
    const result = calculateBalances([
      { type: 'OPENING_BALANCE', currency: 'USD', direction: 'WE_ARE_OWED', amount: usd('5000') },
      { type: 'TRANSFER', direction: 'SENT', currency: 'USD', amount: usd('10000'), commission: usd('50') },
      { type: 'SETTLEMENT', direction: 'THEY_PAID_US', currency: 'USD', amount: usd('3000') },
    ])
    assert.deepEqual(result.USD.weAreOwed, usd('12050'))
  })
})
