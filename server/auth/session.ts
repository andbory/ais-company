import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { prisma } from '../db/prisma.js'

export const SESSION_COOKIE = 'ais_session'
// The session remains valid across browser restarts. The user explicitly ends it via logout.
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await prisma.authSession.create({ data: { tokenHash: hashToken(token), userId, expiresAt } })
  return token
}

export function parseSessionCookie(request: IncomingMessage): string | null {
  const raw = request.headers.cookie ?? ''
  for (const part of raw.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('=')) || null
  }
  return null
}

export function setSessionCookie(response: ServerResponse, token: string, secure: boolean): void {
  const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=31536000']
  if (secure) flags.push('Secure')
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${flags.join('; ')}`)
}

export function clearSessionCookie(response: ServerResponse, secure: boolean): void {
  const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secure) flags.push('Secure')
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${flags.join('; ')}`)
}

export async function findSessionUser(token: string | null) {
  if (!token) return null
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, revokedAt: true, user: { select: { id: true, username: true, role: true, isActive: true } } },
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) return null
  await prisma.authSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
  return session.user
}

export async function revokeSession(token: string | null): Promise<void> {
  if (!token) return
  await prisma.authSession.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } })
}
