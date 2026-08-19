export type ReportFilters = { from?: string; to?: string; currency?: 'USD' | 'IQD' | 'IRR_TOMAN' | 'EUR' | 'SAR'; partyId?: string }

export function validateReportFilters(params: URLSearchParams): ReportFilters {
  const from = params.get('from') || undefined
  const to = params.get('to') || undefined
  const currency = params.get('currency') || undefined
  const partyId = params.get('partyId') || undefined
  for (const [name, value] of [['from', from], ['to', to]] as const) if (value !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)))) throw new Error(`تاريخ ${name} غير صالح.`)
  if (from && to && from > to) throw new Error('نطاق التاريخ غير صالح.')
  if (currency && !['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR'].includes(currency)) throw new Error('عملة التقرير غير صالحة.')
  if (partyId && !/^[0-9a-f-]{36}$/i.test(partyId)) throw new Error('معرّف الجهة غير صالح.')
  return { from, to, currency: currency as ReportFilters['currency'], partyId }
}
