import type { AccountDirection, CurrencyCode } from '../generated/prisma/index.js'

export type OpeningBalanceInput = { partyId: string; currency: CurrencyCode; direction: AccountDirection; amount: string }

const currencies = ['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR']

export function validateOpeningBalanceInput(input: unknown): OpeningBalanceInput {
  if (!input || typeof input !== 'object') throw new Error('بيانات الرصيد الافتتاحي غير صالحة.')
  const value = input as Record<string, unknown>
  if (typeof value.partyId !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.partyId)) throw new Error('الجهة غير صالحة.')
  if (typeof value.currency !== 'string' || !currencies.includes(value.currency)) throw new Error('العملة غير صالحة.')
  if (value.direction !== 'WE_ARE_OWED' && value.direction !== 'THEY_ARE_OWED') throw new Error('اتجاه الرصيد غير صالح.')
  if (typeof value.amount !== 'string' || !/^\d{1,18}(\.\d{1,2})?$/.test(value.amount) || Number(value.amount) <= 0) throw new Error('مبلغ الرصيد يجب أن يكون موجباً وبمنزلتين عشريتين كحد أقصى.')
  return { partyId: value.partyId, currency: value.currency as CurrencyCode, direction: value.direction as AccountDirection, amount: value.amount }
}
