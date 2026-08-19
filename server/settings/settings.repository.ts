import { prisma } from '../db/prisma.js'

export type CompanySettings = {
  arabicName: string
  englishName: string
  systemName: string
  address: string
  phone: string
  logoDataUrl: string | null
  stampDataUrl: string | null
}

export const defaultCompanySettings: CompanySettings = {
  arabicName: 'الشركة العامة للاستيراد والتصدير',
  englishName: 'General Company for Import & Export',
  systemName: 'AIS COMPANY — النظام المالي المتكامل',
  address: '',
  phone: '',
  logoDataUrl: '/icons/ais-192.svg',
  stampDataUrl: null,
}

function text(value: unknown, field: keyof CompanySettings, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`الحقل ${field} غير صالح.`)
  return value.trim()
}

function image(value: unknown, field: 'logoDataUrl' | 'stampDataUrl'): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > 4_000_000 || !/^(data:image\/(?:png|jpeg|jpg|svg\+xml|webp);base64,|\/)/.test(value)) throw new Error(`${field} غير صالح أو حجمه كبير.`)
  return value
}

export function validateCompanySettings(input: unknown): CompanySettings {
  if (!input || typeof input !== 'object') throw new Error('إعدادات الشركة غير صالحة.')
  const value = input as Record<string, unknown>
  return {
    arabicName: text(value.arabicName, 'arabicName', 200),
    englishName: text(value.englishName, 'englishName', 200),
    systemName: text(value.systemName, 'systemName', 200),
    address: text(value.address ?? '', 'address', 500),
    phone: text(value.phone ?? '', 'phone', 50),
    logoDataUrl: image(value.logoDataUrl, 'logoDataUrl'),
    stampDataUrl: image(value.stampDataUrl, 'stampDataUrl'),
  }
}

export const settingsRepository = {
  async getCompany(): Promise<CompanySettings> {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'company_profile' } })
    if (!setting || typeof setting.value !== 'object' || setting.value === null) return defaultCompanySettings
    return { ...defaultCompanySettings, ...(setting.value as Partial<CompanySettings>) }
  },
  async updateCompany(input: CompanySettings): Promise<CompanySettings> {
    await prisma.systemSetting.upsert({ where: { key: 'company_profile' }, update: { value: input }, create: { key: 'company_profile', value: input } })
    return input
  },
}
