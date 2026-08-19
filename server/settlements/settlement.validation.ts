import type { CurrencyCode, SettlementDirection } from '../generated/prisma/index.js'

export type SettlementInput = {
  partyId: string
  date: string
  currency: CurrencyCode
  amount: string
  direction: SettlementDirection
  notes?: string | null
}

const currencies = new Set(['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR'])
const directions = new Set(['WE_PAID_THEM', 'THEY_PAID_US'])

export function validateSettlementInput(input: unknown): SettlementInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات التسوية غير صالحة.')
  const value = input as Record<string, unknown>
  if (typeof value.partyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.partyId)) throw new Error('الجهة غير صالحة.')
  if (!directions.has(String(value.direction))) throw new Error('اتجاه التسوية غير صالح.')
  if (!currencies.has(String(value.currency))) throw new Error('عملة التسوية غير صالحة.')
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || Number.isNaN(Date.parse(`${value.date}T00:00:00Z`))) throw new Error('تاريخ التسوية غير صالح.')
  if ((typeof value.amount !== 'string' && typeof value.amount !== 'number') || !/^\d+(?:\.\d{1,2})?$/.test(String(value.amount).trim()) || Number(String(value.amount)) <= 0) throw new Error('مبلغ التسوية يجب أن يكون أكبر من صفر.')
  if (value.notes !== undefined && value.notes !== null && typeof value.notes !== 'string') throw new Error('ملاحظات التسوية غير صالحة.')
  const notes = typeof value.notes === 'string' ? value.notes.trim() : null
  if (notes && notes.length > 2000) throw new Error('ملاحظات التسوية تتجاوز الحد المسموح.')
  return { partyId: value.partyId, date: value.date, currency: value.currency as CurrencyCode, amount: String(value.amount).trim(), direction: value.direction as SettlementDirection, notes: notes || null }
}
