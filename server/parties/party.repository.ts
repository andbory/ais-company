import { prisma } from '../db/prisma.js'
import type { PartyInput } from './party.validation.js'

const partyInclude = { personProfile: true, officeProfile: true, companyProfile: true } as const

export const partyRepository = {
  async create(input: PartyInput, entityId?: string) {
    return prisma.$transaction(async (tx) => {
      const party = await tx.party.create({ data: { id: entityId, type: input.type, name: input.name, phone: input.phone, address: input.address, country: input.country, notes: input.notes } })
      if (input.type === 'PERSON') await tx.personProfile.create({ data: { partyId: party.id } })
      if (input.type === 'OFFICE') await tx.officeProfile.create({ data: { partyId: party.id, ownerName: input.ownerName } })
      if (input.type === 'COMPANY') await tx.companyProfile.create({ data: { partyId: party.id, responsibleName: input.responsibleName } })
      return tx.party.findUniqueOrThrow({ where: { id: party.id }, include: partyInclude })
    })
  },

  async findAll(search = '') {
    return prisma.party.findMany({
      where: { isArchived: false, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search, mode: 'insensitive' } }, { country: { contains: search, mode: 'insensitive' } }] } : {}) },
      orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
      include: partyInclude,
    })
  },

  async findById(id: string) {
    return prisma.party.findFirst({ where: { id, isArchived: false }, include: partyInclude })
  },

  async update(id: string, input: PartyInput) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.party.findFirst({ where: { id, isArchived: false } })
      if (!existing) return null
      if (existing.type !== input.type) throw new Error('لا يمكن تغيير نوع الجهة بعد إنشائها.')
      await tx.party.update({ where: { id }, data: { name: input.name, phone: input.phone, address: input.address, country: input.country, notes: input.notes } })
      if (input.type === 'PERSON') await tx.personProfile.upsert({ where: { partyId: id }, update: {}, create: { partyId: id } })
      if (input.type === 'OFFICE') await tx.officeProfile.upsert({ where: { partyId: id }, update: { ownerName: input.ownerName }, create: { partyId: id, ownerName: input.ownerName } })
      if (input.type === 'COMPANY') await tx.companyProfile.upsert({ where: { partyId: id }, update: { responsibleName: input.responsibleName }, create: { partyId: id, responsibleName: input.responsibleName } })
      return tx.party.findUniqueOrThrow({ where: { id }, include: partyInclude })
    })
  },

  async archive(id: string) {
    const result = await prisma.party.updateMany({ where: { id, isArchived: false }, data: { isArchived: true } })
    return result.count > 0
  },
}
