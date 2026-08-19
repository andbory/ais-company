import { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../db/prisma.js'
import type { ReportFilters } from './report.validation.js'

const currencies = ['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR'] as const
type Currency = (typeof currencies)[number]

function cents(value: Prisma.Decimal | string): bigint {
  const [whole, fraction = ''] = value.toString().split('.')
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
}

function money(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`
}

function dateWhere(filters: ReportFilters) {
  return filters.from || filters.to ? { date: { ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}), ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}) } } : {}
}

function partyWhere(filters: ReportFilters) {
  return filters.partyId ? { partyId: filters.partyId } : {}
}

async function balanceRows(filters: Pick<ReportFilters, 'partyId' | 'currency'>) {
  const [opening, effects] = await Promise.all([
    prisma.openingBalance.findMany({ where: { ...partyWhere(filters), ...(filters.currency ? { currency: filters.currency } : {}) }, include: { party: { select: { id: true, name: true, type: true } } } }),
    prisma.ledgerEffect.findMany({ where: { ...partyWhere(filters), ...(filters.currency ? { currency: filters.currency } : {}), OR: [{ transferId: { not: null }, transfer: { deletedAt: null } }, { settlementId: { not: null }, settlement: { deletedAt: null } }] }, include: { party: { select: { id: true, name: true, type: true } } } }),
  ])
  const map = new Map<string, { partyId: string; partyName: string; partyType: string; currency: Currency; weAreOwed: bigint; theyAreOwed: bigint }>()
  for (const row of opening) {
    const key = `${row.partyId}:${row.currency}`
    const item = map.get(key) ?? { partyId: row.partyId, partyName: row.party.name, partyType: row.party.type, currency: row.currency as Currency, weAreOwed: 0n, theyAreOwed: 0n }
    row.direction === 'WE_ARE_OWED' ? item.weAreOwed += cents(row.amount) : item.theyAreOwed += cents(row.amount)
    map.set(key, item)
  }
  for (const row of effects) {
    const key = `${row.partyId}:${row.currency}`
    const item = map.get(key) ?? { partyId: row.partyId, partyName: row.party.name, partyType: row.party.type, currency: row.currency as Currency, weAreOwed: 0n, theyAreOwed: 0n }
    row.direction === 'WE_ARE_OWED' ? item.weAreOwed += cents(row.amount) : item.theyAreOwed += cents(row.amount)
    map.set(key, item)
  }
  return [...map.values()].map((row) => ({ ...row, weAreOwed: money(row.weAreOwed), theyAreOwed: money(row.theyAreOwed) }))
}

export const reportRepository = {
  async accounts(filters: Pick<ReportFilters, 'partyId' | 'currency'>) {
    return balanceRows(filters)
  },

  async dashboard(filters: ReportFilters) {
    const [transfers, settlements, balances] = await Promise.all([
      prisma.transfer.findMany({ where: { deletedAt: null, ...partyWhere(filters), ...dateWhere(filters), ...(filters.currency ? { currency: filters.currency } : {}) }, select: { currency: true, direction: true, amount: true, commission: true, total: true } }),
      prisma.settlement.findMany({ where: { deletedAt: null, ...partyWhere(filters), ...dateWhere(filters), ...(filters.currency ? { currency: filters.currency } : {}) }, select: { currency: true, direction: true, amount: true } }),
      balanceRows(filters),
    ])
    const byCurrency = new Map<string, { currency: Currency; sentCount: number; receivedCount: number; settlementCount: number; transferAmount: bigint; commission: bigint; settlementAmount: bigint }>()
    for (const currency of currencies) if (!filters.currency || currency === filters.currency) byCurrency.set(currency, { currency, sentCount: 0, receivedCount: 0, settlementCount: 0, transferAmount: 0n, commission: 0n, settlementAmount: 0n })
    for (const transfer of transfers) { const item = byCurrency.get(transfer.currency)!; transfer.direction === 'SENT' ? item.sentCount++ : item.receivedCount++; item.transferAmount += cents(transfer.total); item.commission += cents(transfer.commission) }
    for (const settlement of settlements) { const item = byCurrency.get(settlement.currency)!; item.settlementCount++; item.settlementAmount += cents(settlement.amount) }
    return { filters, balances, byCurrency: [...byCurrency.values()].map((item) => ({ ...item, transferAmount: money(item.transferAmount), commission: money(item.commission), settlementAmount: money(item.settlementAmount) })), transferCount: transfers.length, settlementCount: settlements.length }
  },

  async transferReport(filters: ReportFilters) {
    const rows = await prisma.transfer.findMany({ where: { deletedAt: null, ...partyWhere(filters), ...dateWhere(filters), ...(filters.currency ? { currency: filters.currency } : {}) }, select: { businessNumber: true, date: true, currency: true, direction: true, amount: true, commission: true, total: true, senderName: true, recipientName: true, beneficiaryName: true, beneficiaryPhone: true, beneficiaryCountry: true, location: true, notes: true, party: { select: { id: true, name: true, type: true, phone: true, address: true, country: true } } }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] })
    return rows.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10), amount: row.amount.toString(), commission: row.commission.toString(), total: row.total.toString() }))
  },

  async settlementReport(filters: ReportFilters) {
    const rows = await prisma.settlement.findMany({ where: { deletedAt: null, ...partyWhere(filters), ...dateWhere(filters), ...(filters.currency ? { currency: filters.currency } : {}) }, select: { businessNumber: true, date: true, currency: true, direction: true, amount: true, party: { select: { id: true, name: true, type: true } } }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] })
    return rows.map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10), amount: row.amount.toString() }))
  },

  async statement(partyId: string, filters: Pick<ReportFilters, 'from' | 'to' | 'currency'>) {
    const rows = await prisma.ledgerEffect.findMany({ where: { partyId, ...(filters.currency ? { currency: filters.currency } : {}), ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}), ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}) } } : {}), OR: [{ transferId: { not: null }, transfer: { deletedAt: null } }, { settlementId: { not: null }, settlement: { deletedAt: null } }] }, orderBy: { createdAt: 'asc' } })
    return rows.map((row) => ({ id: row.id, currency: row.currency, direction: row.direction, amount: row.amount.toString(), operationType: row.operationType, transferId: row.transferId, settlementId: row.settlementId, createdAt: row.createdAt }))
  },
}
