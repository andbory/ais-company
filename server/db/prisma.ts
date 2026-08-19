import prismaPackage from '../generated/prisma/index.js'
import type { PrismaClient as PrismaClientType } from '../generated/prisma/index.js'

const { PrismaClient } = prismaPackage

declare global {
  // eslint-disable-next-line no-var
  var invoicePrisma: PrismaClientType | undefined
}

export const prisma = globalThis.invoicePrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.invoicePrisma = prisma
}
