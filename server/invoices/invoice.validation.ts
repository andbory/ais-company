import prismaPackage from '../generated/prisma/index.js'
import type { Prisma as PrismaNamespace } from '../generated/prisma/index.js'

const { Prisma } = prismaPackage

export type InvoiceItemInput = {
  code: string
  productName: string
  quantity: string
  unitOrWeight: string
  unitPrice: string
}

export type InvoiceInput = {
  invoiceNumber: string
  invoiceType: string
  customerName: string
  date: string
  time: string
  items: InvoiceItemInput[]
}

export type InvoiceUpdateInput = Partial<Omit<InvoiceInput, 'items'>> & { items?: InvoiceItemInput[] }

export type CalculatedInvoice = {
  items: Array<InvoiceItemInput & { total: PrismaNamespace.Decimal }>
  netTotal: PrismaNamespace.Decimal
  amountOwed: PrismaNamespace.Decimal
  totalAmount: PrismaNamespace.Decimal
}

const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new Error(`${field} غير صالح.`)
  }
  return value.trim()
}

function decimal(value: unknown, field: string, scale: number): PrismaNamespace.Decimal {
  if (typeof value !== 'string' || !decimalPattern.test(value)) {
    throw new Error(`${field} يجب أن يكون رقماً عشرياً موجباً.`)
  }
  const parsed = new Prisma.Decimal(value)
  if (!parsed.isFinite() || parsed.lte(0) || parsed.decimalPlaces() > scale) {
    throw new Error(`${field} غير صالح.`)
  }
  return parsed
}

function validateDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('تاريخ الفاتورة غير صالح.')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('تاريخ الفاتورة غير صالح.')
  return date
}

function validateTime(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) throw new Error('وقت الفاتورة غير صالح.')
  const normalized = value.length === 5 ? `${value}:00` : value
  const time = new Date(`1970-01-01T${normalized}.000Z`)
  if (Number.isNaN(time.getTime()) || time.toISOString().slice(11, 19) !== normalized) throw new Error('وقت الفاتورة غير صالح.')
  return time
}

export function validateAndCalculate(input: InvoiceInput): CalculatedInvoice & { date: Date; time: Date; invoiceNumber: string; invoiceType: string; customerName: string } {
  const invoiceNumber = requiredText(input.invoiceNumber, 'رقم الفاتورة', 64)
  const invoiceType = requiredText(input.invoiceType, 'نوع الفاتورة', 100)
  const customerName = requiredText(input.customerName, 'اسم العميل', 200)
  const date = validateDate(input.date)
  const time = validateTime(input.time)
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('يجب إضافة عنصر واحد على الأقل.')

  const items = input.items.map((item) => {
    const quantity = decimal(item.quantity, 'الكمية', 3)
    const unitPrice = decimal(item.unitPrice, 'سعر الوحدة', 2)
    return {
      code: requiredText(item.code, 'كود المنتج', 64),
      productName: requiredText(item.productName, 'اسم المنتج', 200),
      quantity: item.quantity,
      unitOrWeight: requiredText(item.unitOrWeight, 'الوزن / الوحدة', 100),
      unitPrice: item.unitPrice,
      total: quantity.mul(unitPrice).toDecimalPlaces(2),
    }
  })
  const netTotal = items.reduce((sum, item) => sum.add(item.total), new Prisma.Decimal(0)).toDecimalPlaces(2)
  return { invoiceNumber, invoiceType, customerName, date, time, items, netTotal, amountOwed: netTotal, totalAmount: netTotal }
}
