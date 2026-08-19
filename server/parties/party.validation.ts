import type { PartyType } from '../generated/prisma/index.js'

export type PartyInput = {
  type: PartyType
  name: string
  phone?: string | null
  address?: string | null
  country?: string | null
  notes?: string | null
  ownerName?: string | null
  responsibleName?: string | null
}

const limits = { name: 200, phone: 50, address: 500, country: 100, notes: 2000, ownerName: 200, responsibleName: 200 } as const

function optionalText(value: unknown, field: keyof typeof limits): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new Error(`الحقل ${field} غير صالح.`)
  const trimmed = value.trim()
  if (trimmed.length > limits[field]) throw new Error(`الحقل ${field} يتجاوز الحد المسموح.`)
  return trimmed || null
}

export function validatePartyInput(input: unknown): PartyInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات الجهة غير صالحة.')
  const value = input as Record<string, unknown>
  if (value.type !== 'PERSON' && value.type !== 'OFFICE' && value.type !== 'COMPANY') throw new Error('نوع الجهة غير صالح.')
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > limits.name) throw new Error('اسم الجهة مطلوب وصالح.')
  const result: PartyInput = {
    type: value.type,
    name: value.name.trim(),
    phone: optionalText(value.phone, 'phone'),
    address: optionalText(value.address, 'address'),
    country: optionalText(value.country, 'country'),
    notes: optionalText(value.notes, 'notes'),
  }
  if (result.type === 'OFFICE') result.ownerName = optionalText(value.ownerName, 'ownerName')
  if (result.type === 'COMPANY') result.responsibleName = optionalText(value.responsibleName, 'responsibleName')
  return result
}

export function validatePartySearch(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string' || value.length > 200) throw new Error('نص البحث غير صالح.')
  return value.trim()
}
