import type { IncomingMessage } from 'node:http'
import { authorize, type Permission } from './authorization.js'
import { findSessionUser, parseSessionCookie } from './session.js'

export async function requireUser(request: IncomingMessage) {
  const user = await findSessionUser(parseSessionCookie(request))
  if (!user) throw new Error('AUTH_REQUIRED')
  return user
}

export async function requirePermission(request: IncomingMessage, permission: Permission) {
  const user = await requireUser(request)
  authorize(user.role, permission)
  return user
}
