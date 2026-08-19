export type SettlementEffect = { direction: 'WE_ARE_OWED' | 'THEY_ARE_OWED'; amountCents: bigint }

export function calculateSettlementEffects(weAreOwed: bigint, theyAreOwed: bigint, amount: bigint, direction: 'WE_PAID_THEM' | 'THEY_PAID_US'): SettlementEffect[] {
  if (amount <= 0n) throw new Error('مبلغ التسوية يجب أن يكون أكبر من صفر.')
  const target = direction === 'THEY_PAID_US' ? 'WE_ARE_OWED' : 'THEY_ARE_OWED'
  const opposite = target === 'WE_ARE_OWED' ? 'THEY_ARE_OWED' : 'WE_ARE_OWED'
  const targetBalance = target === 'WE_ARE_OWED' ? weAreOwed : theyAreOwed
  const consumed = amount < targetBalance ? amount : targetBalance
  const overflow = amount - consumed
  const effects: SettlementEffect[] = []
  if (consumed > 0n) effects.push({ direction: target, amountCents: consumed })
  if (overflow > 0n) effects.push({ direction: opposite, amountCents: overflow })
  return effects
}
