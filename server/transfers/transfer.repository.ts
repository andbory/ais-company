import { randomInt } from 'node:crypto'
import { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../db/prisma.js'
import type { TransferInput } from './transfer.validation.js'

const transferInclude = { party: { select: { id: true, type: true, name: true } }, ledgerEffects: true } as const

function total(input: TransferInput): Prisma.Decimal {
  return new Prisma.Decimal(input.amount).plus(new Prisma.Decimal(input.commission))
}

function businessNumber(date: string): string {
  return `TR-${date.replaceAll('-', '')}-${randomInt(100000, 999999)}`
}

function effectDirection(direction: TransferInput['direction']) {
  return direction === 'SENT' ? 'WE_ARE_OWED' as const : 'THEY_ARE_OWED' as const
}

function transferData(input: TransferInput, userId: string, mutationId?: string, entityId?: string) {
  return {
    id: entityId,
    partyId: input.partyId,
    direction: input.direction,
    date: new Date(`${input.date}T00:00:00.000Z`),
    senderName: input.senderName,
    recipientName: input.recipientName,
    location: input.location,
    beneficiaryName: input.beneficiaryName,
    beneficiaryPhone: input.beneficiaryPhone,
    beneficiaryCountry: input.beneficiaryCountry,
    currency: input.currency,
    amount: new Prisma.Decimal(input.amount),
    commission: new Prisma.Decimal(input.commission),
    total: total(input),
    notes: input.notes,
    updatedById: userId,
    mutationId,
  }
}

export const transferRepository = {
  async create(input: TransferInput, userId: string, mutationId?: string, entityId?: string) {
    return prisma.$transaction(async (tx) => {
      const data = transferData(input, userId, mutationId, entityId)
      const transfer = await tx.transfer.create({ data: { ...data, businessNumber: businessNumber(input.date), createdById: userId }, select: { id: true } })
      await tx.ledgerEffect.create({ data: { partyId: input.partyId, currency: input.currency, direction: effectDirection(input.direction), amount: data.total, operationType: 'TRANSFER', transferId: transfer.id } })
      await tx.auditLog.create({ data: { userId, action: 'CREATE', entityType: 'TRANSFER', entityId: transfer.id, newValues: { direction: input.direction, currency: input.currency, amount: input.amount, commission: input.commission, total: data.total.toString() } } })
      return tx.transfer.findUniqueOrThrow({ where: { id: transfer.id }, include: transferInclude })
    })
  },

  async findAll(search = '') {
    return prisma.transfer.findMany({
      where: { deletedAt: null, ...(search ? { OR: [{ businessNumber: { contains: search, mode: 'insensitive' } }, { senderName: { contains: search, mode: 'insensitive' } }, { recipientName: { contains: search, mode: 'insensitive' } }] } : {}) },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: transferInclude,
    })
  },

  async findById(id: string) {
    return prisma.transfer.findFirst({ where: { id, deletedAt: null }, include: transferInclude })
  },

  async update(id: string, input: TransferInput, userId: string) {
    return prisma.$transaction(async (tx) => {
      const current = await tx.transfer.findFirst({ where: { id, deletedAt: null } })
      if (!current) return null
      if (current.partyId !== input.partyId || current.currency !== input.currency) throw new Error('لا يمكن تغيير الجهة أو العملة بعد إنشاء الحوالة.')
      const data = transferData(input, userId)
      await tx.transfer.update({ where: { id }, data: { ...data, version: { increment: 1 } } })
      await tx.ledgerEffect.updateMany({ where: { transferId: id }, data: { amount: data.total, direction: effectDirection(input.direction) } })
      await tx.auditLog.create({ data: { userId, action: 'UPDATE', entityType: 'TRANSFER', entityId: id, oldValues: { amount: current.amount.toString(), commission: current.commission.toString(), total: current.total.toString() }, newValues: { amount: input.amount, commission: input.commission, total: data.total.toString() } } })
      return tx.transfer.findUniqueOrThrow({ where: { id }, include: transferInclude })
    })
  },

  async archive(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.transfer.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date(), updatedById: userId, version: { increment: 1 } } })
      if (!result.count) return false
      await tx.auditLog.create({ data: { userId, action: 'ARCHIVE', entityType: 'TRANSFER', entityId: id } })
      return true
    })
  },
}
