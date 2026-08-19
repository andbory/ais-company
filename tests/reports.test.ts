import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeRows, totalByCurrency } from '../server/reports/report.math.ts'
import { validateReportFilters } from '../server/reports/report.validation.ts'

test('summarizes balances and commissions without cross-currency arithmetic', () => {
  assert.deepEqual(summarizeRows([
    { direction: 'WE_ARE_OWED', amountCents: 10000n, commissionCents: 50n },
    { direction: 'THEY_ARE_OWED', amountCents: 2500n, commissionCents: 25n },
  ]), { weAreOwed: 10000n, theyAreOwed: 2500n, commission: 75n })
})

test('rejects negative report rows and groups totals by currency', () => {
  assert.throws(() => summarizeRows([{ direction: 'WE_ARE_OWED', amountCents: -1n }]), /سالب/)
  assert.deepEqual([...totalByCurrency([{ currency: 'USD', amountCents: 100n }, { currency: 'IQD', amountCents: 200n }, { currency: 'USD', amountCents: 50n }])], [['USD', 150n], ['IQD', 200n]])
})

test('validates report filters', () => {
  const filters = validateReportFilters(new URLSearchParams('from=2026-01-01&to=2026-08-19&currency=USD'))
  assert.equal(filters.currency, 'USD')
  assert.throws(() => validateReportFilters(new URLSearchParams('from=2026-08-20&to=2026-01-01')), /نطاق/)
  assert.throws(() => validateReportFilters(new URLSearchParams('currency=GBP')), /عملة/)
})
