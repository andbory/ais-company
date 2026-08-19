export type UserRole = 'ADMIN' | 'VIEWER'

export const permissions = [
  'parties:read', 'parties:write',
  'transfers:read', 'transfers:write', 'transfers:delete',
  'settlements:read', 'settlements:write',
  'opening-balances:read', 'opening-balances:write',
  'reports:read', 'settings:write', 'audit:read', 'print:export', 'sync:read', 'sync:write', 'backup:read', 'backup:write',
] as const

export type Permission = (typeof permissions)[number]

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set(permissions),
  VIEWER: new Set(['parties:read', 'transfers:read', 'settlements:read', 'opening-balances:read', 'reports:read', 'print:export']),
}

export function can(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.has(permission) ?? false
}

export class ForbiddenError extends Error {
  constructor(message = 'ليس لديك صلاحية لتنفيذ هذه العملية.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export function authorize(role: UserRole, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError()
}
