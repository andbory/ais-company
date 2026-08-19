import { randomInt } from 'node:crypto'
import { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../db/prisma.js'
import { calculateSettlementEffects } from './settlement.effects.js'
import type { SettlementInput } from './settlement.validation.js'

const settlementInclude = { party: { select: { id: true, type: true, name: true } }, ledgerEffects: true } as const

function cents(value: Prisma.Decimal | string): bigint {
  const normalized = value.toString()
  const [whole, fraction = ''] = normalized.split('.')
  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
}

function decimalFromCents(value: bigint): Prisma.Decimal {
  return new Prisma.Decimal(`${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`)
}

function businessNumber(date: string): string {
  return `ST-${date.replaceAll('-', '')}-${randomInt(100000, 999999)}`
}

async function currentBalances(tx: Prisma.TransactionClient, partyId: string, currency: SettlementInput['currency']) {
  const [opening, effects] = await Promise.all([
    tx.openingBalance.findMany({ where: { partyId, currency } }),
    tx.ledgerEffect.findMany({ where: { partyId, currency, OR: [{ transferId: { not: null }, transfer: { deletedAt: null } }, { settlementId: { not: null }, settlement: { deletedAt: null } }] } }),
  ])
  let weAreOwed = 0n
  let theyAreOwed = 0n
  for (const item of opening) item.direction === 'WE_ARE_OWED' ? weAreOwed += cents(item.amount) : theyAreOwed += cents(item.amount)
  for (const item of effects) item.direction === 'WE_ARE_OWED' ? weAreOwed += cents(item.amount) : theyAreOwed += cents(item.amount)
  return { weAreOwed, theyAreOwed }
}

export const settlementRepository = {
  async create(input: SettlementInput, userId: string, mutationId?: string, entityId?: string) {
    return prisma.$transaction(async (tx) => {
      const balances = await currentBalances(tx, input.partyId, input.currency)
      const effects = calculateSettlementEffects(balances.weAreOwed, balances.theyAreOwed, cents(input.amount), input.direction)
      const settlement = await tx.settlement.create({ data: { id: entityId, mutationId, businessNumber: businessNumber(input.date), partyId: input.partyId, date: new Date(`${input.date}T00:00:00.000Z`), currency: input.currency, amount: new Prisma.Decimal(input.amount), direction: input.direction, notes: input.notes, createdById: userId, updatedById: userId }, select: { id: true } })
      for (const effect of effects) await tx.ledgerEffect.create({ data: { partyId: input.partyId, currency: input.currency, direction: effect.direction, amount: decimalFromCents(effect.amountCents), operationType: 'SETTLEMENT', settlementId: settlement.id } })
      await tx.auditLog.create({ data: { userId, action: 'CREATE', entityType: 'SETTLEMENT', entityId: settlement.id, newValues: { direction: input.direction, currency: input.currency, amount: input.amount, effectCount: effects.length } } })
      return tx.settlement.findUniqueOrThrow({ where: { id: settlement.id }, include: settlementInclude })
    })
  },

  async findAll(search = '') {
    return prisma.settlement.findMany({ where: { deletedAt: null, ...(search ? { businessNumber: { contains: search, mode: 'insensitive' } } : {}) }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], include: settlementInclude })
  },

  async findById(id: string) {
    return prisma.settlement.findFirst({ where: { id, deletedAt: null }, include: settlementInclude })
  },

  async update(id: string, input: SettlementInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.settlement.findFirst({ where: { id, deletedAt: null } })
      if (!current) return null
      if (current.partyId !== input.partyId || current.currency !== input.currency || current.amount.toString() !== new Prisma.Decimal(input.amount).toString() || current.direction !== input.direction) throw new Error('لا يمكن تغيير الجهة أو العملة أو المبلغ أو اتجاه التسوية بعد تسجيلها.')
      await tx.settlement.update({ where: { id }, data: { date: new Date(`${input.date}T00:00:00.000Z`), notes: input.notes, updatedById: userId, version: { increment: 1 } } })
      await tx.auditLog.create({ data: { userId, action: 'UPDATE', entityType: 'SETTLEMENT', entityId: id, newValues: { date: input.date, notes: input.notes } } })
      return tx.settlement.findUniqueOrThrow({ where: { id }, include: settlementInclude })
    })
  },

  async archive(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.settlement.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), updatedById: userId, version: { increment: 1 } } })
      if (!result.count) return false
      await tx.auditLog.create({ data: { userId, action: 'ARCHIVE', entityType: 'SETTLEMENT', entityId: id } })
      return true
    })
  },
}
