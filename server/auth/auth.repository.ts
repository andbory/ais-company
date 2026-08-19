import { prisma } from '../db/prisma.js'
import { verifyPassword } from './password.js'
import { createSession } from './session.js'

export async function login(username: string, password: string) {
  const normalizedUsername = username.trim()
  if (!normalizedUsername || typeof password !== 'string' || password.length > 256) return null
  const user = await prisma.user.findUnique({ where: { username: normalizedUsername } })
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) return null
  const token = await createSession(user.id)
  return { token, user: { id: user.id, username: user.username, role: user.role } }
}
