import prismaPackage from '../generated/prisma/index.js'
import type { Prisma as PrismaNamespace } from '../generated/prisma/index.js'
import { prisma } from '../db/prisma.js'
import { validateAndCalculate, type InvoiceInput, type InvoiceUpdateInput } from './invoice.validation.js'

const { Prisma } = prismaPackage

const itemData = (item: { code: string; productName: string; quantity: string; unitOrWeight: string; unitPrice: string; total: PrismaNamespace.Decimal }) => ({
  code: item.code,
  productName: item.productName,
  quantity: new Prisma.Decimal(item.quantity),
  unitOrWeight: item.unitOrWeight,
  unitPrice: new Prisma.Decimal(item.unitPrice),
  total: item.total,
})

export const invoiceRepository = {
  create(input: InvoiceInput) {
    const calculated = validateAndCalculate(input)
    return prisma.invoice.create({
      data: {
        invoiceNumber: calculated.invoiceNumber,
        invoiceType: calculated.invoiceType,
        customerName: calculated.customerName,
        date: calculated.date,
        time: calculated.time,
        netTotal: calculated.netTotal,
        amountOwed: calculated.amountOwed,
        totalAmount: calculated.totalAmount,
        items: { create: calculated.items.map(itemData) },
      },
      include: { items: true },
    })
  },

  findAll() {
    return prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, include: { items: true } })
  },

  findById(id: string) {
    return prisma.invoice.findUnique({ where: { id }, include: { items: true } })
  },

  async update(id: string, input: InvoiceUpdateInput) {
    const current = await prisma.invoice.findUnique({ where: { id }, include: { items: true } })
    if (!current) return null
    const merged: InvoiceInput = {
      invoiceNumber: input.invoiceNumber ?? current.invoiceNumber,
      invoiceType: input.invoiceType ?? current.invoiceType,
      customerName: input.customerName ?? current.customerName,
      date: input.date ?? current.date.toISOString().slice(0, 10),
      time: input.time ?? current.time.toISOString().slice(11, 19),
      items: input.items ?? current.items.map((item) => ({ code: item.code, productName: item.productName, quantity: item.quantity.toString(), unitOrWeight: item.unitOrWeight, unitPrice: item.unitPrice.toString() })),
    }
    const calculated = validateAndCalculate(merged)
    return prisma.$transaction(async (transaction) => {
      await transaction.invoiceItem.deleteMany({ where: { invoiceId: id } })
      return transaction.invoice.update({
        where: { id },
        data: {
          invoiceNumber: calculated.invoiceNumber,
          invoiceType: calculated.invoiceType,
          customerName: calculated.customerName,
          date: calculated.date,
          time: calculated.time,
          netTotal: calculated.netTotal,
          amountOwed: calculated.amountOwed,
          totalAmount: calculated.totalAmount,
          items: { create: calculated.items.map(itemData) },
        },
        include: { items: true },
      })
    })
  },

  delete(id: string) {
    return prisma.invoice.delete({ where: { id } })
  },
}
