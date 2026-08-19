import type { CurrencyCode, TransferDirection } from '../generated/prisma/index.js'

export type TransferInput = {
  partyId: string
  direction: TransferDirection
  date: string
  senderName: string
  recipientName?: string | null
  location?: string | null
  beneficiaryName?: string | null
  beneficiaryPhone?: string | null
  beneficiaryCountry?: string | null
  currency: CurrencyCode
  amount: string
  commission: string
  notes?: string | null
}

const currencies = new Set(['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR'])
const directions = new Set(['SENT', 'RECEIVED'])
const limits = { senderName: 200, recipientName: 200, location: 200, beneficiaryName: 200, beneficiaryPhone: 50, beneficiaryCountry: 100, notes: 2000 } as const

function text(value: unknown, field: keyof typeof limits, required = false): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`الحقل ${field} مطلوب.`)
    return null
  }
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limits[field]) throw new Error(`الحقل ${field} غير صالح.`)
  return value.trim()
}

function money(value: unknown, field: string, allowZero: boolean): string {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`${field} غير صالح.`)
  const normalized = String(value).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error(`${field} غير صالح.`)
  const numeric = Number(normalized)
  if (!Number.isFinite(numeric) || (allowZero ? numeric < 0 : numeric <= 0)) throw new Error(`${field} يجب أن يكون ${allowZero ? 'موجباً أو صفراً' : 'أكبر من صفر'}.`)
  return normalized
}

export function validateTransferInput(input: unknown): TransferInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات الحوالة غير صالحة.')
  const value = input as Record<string, unknown>
  if (typeof value.partyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.partyId)) throw new Error('الجهة غير صالحة.')
  if (!directions.has(String(value.direction))) throw new Error('اتجاه الحوالة غير صالح.')
  if (!currencies.has(String(value.currency))) throw new Error('عملة الحوالة غير صالحة.')
  if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date) || Number.isNaN(Date.parse(`${value.date}T00:00:00Z`))) throw new Error('تاريخ الحوالة غير صالح.')
  return {
    partyId: value.partyId,
    direction: value.direction as TransferDirection,
    date: value.date,
    senderName: text(value.senderName, 'senderName', true)!,
    recipientName: text(value.recipientName, 'recipientName'),
    location: text(value.location, 'location'),
    beneficiaryName: text(value.beneficiaryName, 'beneficiaryName'),
    beneficiaryPhone: text(value.beneficiaryPhone, 'beneficiaryPhone'),
    beneficiaryCountry: text(value.beneficiaryCountry, 'beneficiaryCountry'),
    currency: value.currency as CurrencyCode,
    amount: money(value.amount, 'amount', false),
    commission: money(value.commission, 'commission', true),
    notes: text(value.notes, 'notes'),
  }
}
