import path from 'node:path'

export function backupFilePath(directory: string, id: string): string {
  if (!directory.trim()) throw new Error('مسار النسخ الاحتياطي غير صالح.')
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('معرّف النسخة غير صالح.')
  const root = path.resolve(directory)
  const file = path.resolve(root, `ais-backup-${id}.dump`)
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error('مسار النسخة خارج المجلد المسموح.')
  return file
}

export function validateRetentionDays(value: string | undefined): number {
  const days = value === undefined ? 30 : Number(value)
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('مدة الاحتفاظ غير صالحة.')
  return days
}
