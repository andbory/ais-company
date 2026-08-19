import { prisma } from '../db/prisma.js'
import { Prisma } from '../generated/prisma/index.js'
import { partyRepository } from '../parties/party.repository.js'
import { validatePartyInput } from '../parties/party.validation.js'
import { transferRepository } from '../transfers/transfer.repository.js'
import { validateTransferInput } from '../transfers/transfer.validation.js'
import { settlementRepository } from '../settlements/settlement.repository.js'
import { validateSettlementInput } from '../settlements/settlement.validation.js'
import type { SyncMutationInput } from './sync.validation.js'

const MAX_PULL = 100

async function applyMutation(mutation: SyncMutationInput, userId: string) {
  switch (mutation.operation) {
    case 'CREATE_PARTY': return partyRepository.create(validatePartyInput(mutation.payload), mutation.entityId)
    case 'UPDATE_PARTY': return partyRepository.update(mutation.entityId, validatePartyInput(mutation.payload))
    case 'ARCHIVE_PARTY': return partyRepository.archive(mutation.entityId)
    case 'CREATE_TRANSFER': return transferRepository.create(validateTransferInput(mutation.payload), userId, mutation.mutationId, mutation.entityId)
    case 'UPDATE_TRANSFER': return transferRepository.update(mutation.entityId, validateTransferInput(mutation.payload), userId)
    case 'ARCHIVE_TRANSFER': return transferRepository.archive(mutation.entityId, userId)
    case 'CREATE_SETTLEMENT': return settlementRepository.create(validateSettlementInput(mutation.payload), userId, mutation.mutationId, mutation.entityId)
    case 'UPDATE_SETTLEMENT': return settlementRepository.update(mutation.entityId, validateSettlementInput(mutation.payload), userId)
    case 'ARCHIVE_SETTLEMENT': return settlementRepository.archive(mutation.entityId, userId)
  }
}

async function process(mutation: SyncMutationInput, userId: string) {
  try {
    await prisma.syncMutation.update({ where: { mutationId: mutation.mutationId }, data: { status: 'PROCESSING', attempts: { increment: 1 } } })
    const result = await applyMutation(mutation, userId)
    if (result === null || result === false) throw new Error('السجل المطلوب للمزامنة غير موجود.')
    await prisma.syncMutation.update({ where: { mutationId: mutation.mutationId }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), lastError: null } })
    return { mutationId: mutation.mutationId, entityId: mutation.entityId, status: 'ACKNOWLEDGED' as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'فشلت عملية المزامنة.'
    await prisma.syncMutation.update({ where: { mutationId: mutation.mutationId }, data: { status: 'FAILED', lastError: message.slice(0, 2000) } })
    return { mutationId: mutation.mutationId, entityId: mutation.entityId, status: 'FAILED' as const, error: message }
  }
}

export const syncRepository = {
  async push(mutations: SyncMutationInput[], userId: string) {
    const results: Array<{ mutationId: string; status: string; entityId: string; error?: string }> = []
    for (const mutation of mutations) {
      let existing = await prisma.syncMutation.findUnique({ where: { mutationId: mutation.mutationId }, select: { mutationId: true, entityId: true, status: true, payload: true, operation: true, entityType: true, userId: true } })
      if (!existing) {
        try {
          existing = await prisma.syncMutation.create({ data: { mutationId: mutation.mutationId, entityType: mutation.entityType, entityId: mutation.entityId, operation: mutation.operation, payload: mutation.payload as Prisma.InputJsonValue, userId, status: 'PENDING' }, select: { mutationId: true, entityId: true, status: true, payload: true, operation: true, entityType: true, userId: true } })
        } catch {
          existing = await prisma.syncMutation.findUniqueOrThrow({ where: { mutationId: mutation.mutationId }, select: { mutationId: true, entityId: true, status: true, payload: true, operation: true, entityType: true, userId: true } })
        }
      }
      if (existing.userId !== userId) { results.push({ mutationId: mutation.mutationId, entityId: mutation.entityId, status: 'FAILED', error: 'لا يمكن استخدام mutation تخص مستخدماً آخر.' }); continue }
      if (existing.status === 'ACKNOWLEDGED') { results.push({ mutationId: existing.mutationId, entityId: existing.entityId, status: existing.status }); continue }
      const normalized = { mutationId: existing.mutationId, entityId: existing.entityId, entityType: existing.entityType as SyncMutationInput['entityType'], operation: existing.operation as SyncMutationInput['operation'], payload: existing.payload, expectedVersion: mutation.expectedVersion }
      results.push(await process(normalized, userId))
    }
    return results
  },

  async pull(userId: string, cursor: Date | null) {
    const rows = await prisma.syncMutation.findMany({ where: { userId, ...(cursor ? { updatedAt: { gt: cursor } } : {}) }, orderBy: { updatedAt: 'asc' }, take: MAX_PULL })
    const nextCursor = rows.length ? rows[rows.length - 1].updatedAt.toISOString() : cursor?.toISOString() ?? null
    return { mutations: rows, nextCursor, hasMore: rows.length === MAX_PULL }
  },

  async acknowledge(userId: string, mutationIds: string[]) {
    if (!mutationIds.length) return 0
    const result = await prisma.syncMutation.updateMany({ where: { userId, mutationId: { in: mutationIds }, status: { in: ['PENDING', 'PROCESSING'] } }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() } })
    return result.count
  },
}
