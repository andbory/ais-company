export type ReportDirection = 'WE_ARE_OWED' | 'THEY_ARE_OWED'
export type ReportRow = { direction: ReportDirection; amountCents: bigint; commissionCents?: bigint }

export function summarizeRows(rows: readonly ReportRow[]) {
  let weAreOwed = 0n
  let theyAreOwed = 0n
  let commission = 0n
  for (const row of rows) {
    if (row.amountCents < 0n) throw new Error('لا يمكن تلخيص مبلغ سالب.')
    if (row.direction === 'WE_ARE_OWED') weAreOwed += row.amountCents
    else theyAreOwed += row.amountCents
    commission += row.commissionCents ?? 0n
  }
  return { weAreOwed, theyAreOwed, commission }
}

export function totalByCurrency<T extends { currency: string; amountCents: bigint }>(rows: readonly T[]) {
  const totals = new Map<string, bigint>()
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0n) + row.amountCents)
  return totals
}
