export const supportedCurrencies = ['USD', 'IQD', 'IRR_TOMAN', 'EUR', 'SAR'] as const
export type CurrencyCode = (typeof supportedCurrencies)[number]

export type AccountDirection = 'WE_ARE_OWED' | 'THEY_ARE_OWED'
export type TransferDirection = 'SENT' | 'RECEIVED'
export type SettlementDirection = 'WE_PAID_THEM' | 'THEY_PAID_US'

/** Monetary values are stored as integer minor units, never JavaScript floats. */
export type Money = Readonly<{ currency: CurrencyCode; cents: bigint }>
export type DirectionalBalance = Readonly<{ weAreOwed: Money; theyAreOwed: Money }>
export type AccountBalances = { [currency in CurrencyCode]: DirectionalBalance }
export type FinancialOperation =
  | { type: 'OPENING_BALANCE'; currency: CurrencyCode; direction: AccountDirection; amount: Money }
  | { type: 'TRANSFER'; direction: TransferDirection; currency: CurrencyCode; amount: Money; commission: Money }
  | { type: 'SETTLEMENT'; direction: SettlementDirection; currency: CurrencyCode; amount: Money }

const currencySet = new Set<string>(supportedCurrencies)

function assertCurrency(currency: string): asserts currency is CurrencyCode {
  if (!currencySet.has(currency)) throw new Error(`Unsupported currency: ${currency}`)
}

function assertSameCurrency(left: Money, right: Money) {
  if (left.currency !== right.currency) throw new Error('Money values must use the same currency.')
}

function money(currency: CurrencyCode, cents: bigint): Money {
  if (cents < 0n) throw new Error('Money cannot be negative.')
  return { currency, cents }
}

export function parseMoney(value: string, currency: CurrencyCode, options: { allowZero?: boolean } = {}): Money {
  assertCurrency(currency)
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Money must be a positive decimal with up to two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0')
  if (cents === 0n && !options.allowZero) throw new Error('Money must be greater than zero.')
  return money(currency, cents)
}

export function formatMoney(value: Money): string {
  const whole = value.cents / 100n
  const cents = String(value.cents % 100n).padStart(2, '0')
  return `${whole}.${cents}`
}

export function createEmptyBalances(): AccountBalances {
  return Object.fromEntries(supportedCurrencies.map((currency) => [currency, {
    weAreOwed: money(currency, 0n),
    theyAreOwed: money(currency, 0n),
  }])) as AccountBalances
}

function normalizedBalances(balances: Partial<AccountBalances>): AccountBalances {
  const empty = createEmptyBalances()
  for (const currency of supportedCurrencies) {
    const existing = balances[currency]
    if (!existing) continue
    assertSameCurrency(existing.weAreOwed, existing.theyAreOwed)
    if (existing.weAreOwed.currency !== currency) throw new Error('Balance currency key does not match its value.')
    empty[currency] = {
      weAreOwed: money(currency, existing.weAreOwed.cents),
      theyAreOwed: money(currency, existing.theyAreOwed.cents),
    }
  }
  return empty
}

export function totalForTransfer(amount: Money, commission: Money): Money {
  assertSameCurrency(amount, commission)
  if (amount.cents <= 0n) throw new Error('Transfer amount must be greater than zero.')
  if (commission.cents < 0n) throw new Error('Commission cannot be negative.')
  return money(amount.currency, amount.cents + commission.cents)
}

function applyOpeningBalance(balances: Partial<AccountBalances>, input: Extract<FinancialOperation, { type: 'OPENING_BALANCE' }>): AccountBalances {
  if (input.amount.currency !== input.currency) throw new Error('Opening balance currency does not match its money value.')
  const next = normalizedBalances(balances)
  const current = next[input.currency]
  next[input.currency] = input.direction === 'WE_ARE_OWED'
    ? { ...current, weAreOwed: money(input.currency, current.weAreOwed.cents + input.amount.cents) }
    : { ...current, theyAreOwed: money(input.currency, current.theyAreOwed.cents + input.amount.cents) }
  return next
}

export function applyTransfer(
  balances: Partial<AccountBalances>,
  input: { direction: TransferDirection; currency: CurrencyCode; amount: Money; commission: Money },
): AccountBalances {
  if (input.amount.currency !== input.currency || input.commission.currency !== input.currency) throw new Error('Transfer currency does not match its money values.')
  const total = totalForTransfer(input.amount, input.commission)
  const next = normalizedBalances(balances)
  const current = next[input.currency]
  next[input.currency] = input.direction === 'SENT'
    ? { ...current, weAreOwed: money(input.currency, current.weAreOwed.cents + total.cents) }
    : { ...current, theyAreOwed: money(input.currency, current.theyAreOwed.cents + total.cents) }
  return next
}

function settleAgainst(primary: Money, secondary: Money, amount: Money): DirectionalBalance {
  assertSameCurrency(primary, secondary)
  assertSameCurrency(primary, amount)
  if (amount.cents <= 0n) throw new Error('Settlement amount must be greater than zero.')
  const applied = amount.cents < primary.cents ? amount.cents : primary.cents
  const overflow = amount.cents - applied
  return {
    weAreOwed: money(primary.currency, primary.cents - applied),
    theyAreOwed: money(secondary.currency, secondary.cents + overflow),
  }
}

export function applySettlement(
  balances: Partial<AccountBalances>,
  input: { direction: SettlementDirection; currency: CurrencyCode; amount: Money },
): AccountBalances {
  if (input.amount.currency !== input.currency) throw new Error('Settlement currency does not match its money value.')
  const next = normalizedBalances(balances)
  const current = next[input.currency]
  next[input.currency] = input.direction === 'THEY_PAID_US'
    ? settleAgainst(current.weAreOwed, current.theyAreOwed, input.amount)
    : (() => {
        const result = settleAgainst(current.theyAreOwed, current.weAreOwed, input.amount)
        return { weAreOwed: result.theyAreOwed, theyAreOwed: result.weAreOwed }
      })()
  return next
}

/** Replays immutable financial operations to derive the current balances. */
export function calculateBalances(operations: readonly FinancialOperation[]): AccountBalances {
  let balances: Partial<AccountBalances> = createEmptyBalances()
  for (const operation of operations) {
    balances = operation.type === 'OPENING_BALANCE'
      ? applyOpeningBalance(balances, operation)
      : operation.type === 'TRANSFER'
        ? applyTransfer(balances, operation)
        : applySettlement(balances, operation)
  }
  return normalizedBalances(balances)
}
