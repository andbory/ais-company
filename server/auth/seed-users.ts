import 'dotenv/config'
import { prisma } from '../db/prisma.js'
import { hashPassword } from './password.js'

async function main() {
  const adminPassword = process.env.AIS_ADMIN_PASSWORD
  const viewerPassword = process.env.AIS_VIEWER_PASSWORD
  if (!adminPassword || !viewerPassword) {
    throw new Error('يجب ضبط AIS_ADMIN_PASSWORD و AIS_VIEWER_PASSWORD قبل تهيئة الحسابات.')
  }

  await prisma.user.upsert({
    where: { username: 'AIS' },
    update: { passwordHash: await hashPassword(adminPassword), role: 'ADMIN', isActive: true },
    create: { username: 'AIS', passwordHash: await hashPassword(adminPassword), role: 'ADMIN' },
  })
  await prisma.user.upsert({
    where: { username: 'User' },
    update: { passwordHash: await hashPassword(viewerPassword), role: 'VIEWER', isActive: true },
    create: { username: 'User', passwordHash: await hashPassword(viewerPassword), role: 'VIEWER' },
  })
  console.log('Authentication users initialized.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'تعذر تهيئة الحسابات.')
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
