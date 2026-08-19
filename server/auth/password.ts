import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const SALT_BYTES = 16
const KEY_BYTES = 64
const MIN_PASSWORD_LENGTH = 8
const FORMAT = 'scrypt-v1'

export function assertPasswordStrength(password: string): void {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`كلمة المرور يجب أن تحتوي على ${MIN_PASSWORD_LENGTH} محارف على الأقل.`)
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordStrength(password)
  const salt = randomBytes(SALT_BYTES)
  const derivedKey = (await scrypt(password, salt, KEY_BYTES)) as Buffer
  return `${FORMAT}$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  if (typeof password !== 'string' || typeof encodedHash !== 'string') return false
  const [format, saltText, keyText] = encodedHash.split('$')
  if (format !== FORMAT || !saltText || !keyText) return false
  try {
    const salt = Buffer.from(saltText, 'base64url')
    const expected = Buffer.from(keyText, 'base64url')
    if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false
    const actual = (await scrypt(password, salt, KEY_BYTES)) as Buffer
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
