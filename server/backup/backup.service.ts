import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { prisma } from '../db/prisma.js'
import { backupFilePath } from './backup.validation.js'

function backupDirectory() {
  return path.resolve(process.env.BACKUP_DIRECTORY?.trim() || path.resolve(process.cwd(), 'backups'))
}

function databaseConnection() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL غير مضبوط.')
  const url = new URL(raw)
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') throw new Error('DATABASE_URL يجب أن يكون PostgreSQL.')
  return { host: url.hostname, port: url.port || '5432', username: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.replace(/^\//, '') }
}

async function checksum(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(filePath)) hash.update(chunk)
  return hash.digest('hex')
}

function runPgDump(filePath: string, connection: ReturnType<typeof databaseConnection>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PG_DUMP_PATH?.trim() || 'pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--file', filePath, '--host', connection.host, '--port', connection.port, '--username', connection.username, connection.database], { env: { ...process.env, PGPASSWORD: connection.password }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    let errorOutput = ''
    child.stderr.on('data', (chunk: Buffer) => { errorOutput += chunk.toString().slice(0, 2000) })
    child.on('error', () => reject(new Error('تعذر تشغيل pg_dump. تأكد من تثبيت PostgreSQL وإضافة pg_dump إلى PATH.')))
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`فشل النسخ الاحتياطي برمز ${code ?? 'غير معروف'}: ${errorOutput.trim()}`)))
  })
}

export const backupService = {
  async start(userId: string) {
    const id = randomUUID()
    const directory = backupDirectory()
    const filePath = backupFilePath(directory, id)
    await mkdir(directory, { recursive: true })
    const metadata = await prisma.backupMetadata.create({ data: { id, startedAt: new Date(), status: 'RUNNING', storageKey: filePath } })
    try {
      await runPgDump(filePath, databaseConnection())
      const file = await stat(filePath)
      const digest = await checksum(filePath)
      const completed = await prisma.backupMetadata.update({ where: { id: metadata.id }, data: { completedAt: new Date(), status: 'COMPLETED', sizeBytes: BigInt(file.size), checksum: digest } })
      await prisma.auditLog.create({ data: { userId, action: 'CREATE', entityType: 'BACKUP', entityId: metadata.id, newValues: { status: 'COMPLETED', checksum: digest, sizeBytes: file.size } } })
      return completed
    } catch (error) {
      await prisma.backupMetadata.update({ where: { id: metadata.id }, data: { completedAt: new Date(), status: 'FAILED' } })
      await prisma.auditLog.create({ data: { userId, action: 'CREATE', entityType: 'BACKUP', entityId: metadata.id, newValues: { status: 'FAILED' } } })
      throw error
    }
  },

  async list() {
    return prisma.backupMetadata.findMany({ orderBy: { startedAt: 'desc' }, take: 50, select: { id: true, startedAt: true, completedAt: true, status: true, storageKey: true, checksum: true, sizeBytes: true } })
  },
}
