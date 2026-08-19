export const applicationAreas = [
  'dashboard',
  'transfers',
  'settlements',
  'people',
  'offices',
  'companies',
  'reports',
  'settings',
] as const

export type ApplicationArea = (typeof applicationAreas)[number]
export type UserRole = 'admin' | 'viewer'

export const visibleAreasByRole: Record<UserRole, readonly ApplicationArea[]> = {
  admin: applicationAreas,
  viewer: ['transfers', 'people', 'offices', 'companies'],
}

