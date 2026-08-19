import { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../db/prisma.js'
import type { OpeningBalanceInput } from './opening-balance.validation.js'

const include = { party: { select: { id: true, name: true, type: true } } } as const

export const openingBalanceRepository = {
  async findAll() {
    return prisma.openingBalance.findMany({ orderBy: [{ updatedAt: 'desc' }], include })
  },
  async upsert(input: OpeningBalanceInput) {
    return prisma.openingBalance.upsert({
      where: { partyId_currency_direction: { partyId: input.partyId, currency: input.currency, direction: input.direction } },
      update: { amount: new Prisma.Decimal(input.amount) },
      create: { partyId: input.partyId, currency: input.currency, direction: input.direction, amount: new Prisma.Decimal(input.amount) },
      include,
    })
  },
  async delete(id: string) {
    const result = await prisma.openingBalance.deleteMany({ where: { id } })
    return result.count > 0
  },
}
