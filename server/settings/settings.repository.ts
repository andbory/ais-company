import { prisma } from '../db/prisma.js'

export type CompanySettings = {
  arabicName: string
  englishName: string
  systemName: string
  address: string
  phone: string
  logoDataUrl: string | null
  stampDataUrl: string | null
  companyPeople: Array<{ id: string; name: string; role: string }>
}

export const defaultCompanySettings: CompanySettings = {
  arabicName: 'الشركة العامة للاستيراد والتصدير',
  englishName: 'General Company for Import & Export',
  systemName: 'AIS COMPANY — النظام المالي المتكامل',
  address: '',
  phone: '',
  logoDataUrl: '/brand/company-logo.png',
  stampDataUrl: '/brand/company-stamp.png',
  companyPeople: [],
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

function people(value: unknown): Array<{ id: string; name: string; role: string }> {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 100) throw new Error('أشخاص الشركة غير صالحين.')
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('بيانات شخص الشركة غير صالحة.')
    const person = item as Record<string, unknown>
    if (typeof person.id !== 'string' || !person.id || typeof person.name !== 'string' || !person.name.trim() || person.name.length > 200 || typeof person.role !== 'string' || person.role.length > 120) throw new Error('بيانات شخص الشركة غير صالحة.')
    return { id: person.id, name: person.name.trim(), role: person.role.trim() }
  })
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
    companyPeople: people(value.companyPeople),
  }
}

export const settingsRepository = {
  async getCompany(): Promise<CompanySettings> {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'company_profile' } })
    if (!setting || typeof setting.value !== 'object' || setting.value === null) return defaultCompanySettings
    const saved = setting.value as Partial<CompanySettings>
    return {
      ...defaultCompanySettings,
      ...saved,
      logoDataUrl: saved.logoDataUrl === '/icons/ais-192.svg' ? defaultCompanySettings.logoDataUrl : (saved.logoDataUrl ?? defaultCompanySettings.logoDataUrl),
      stampDataUrl: saved.stampDataUrl ?? defaultCompanySettings.stampDataUrl,
    }
  },
  async updateCompany(input: CompanySettings): Promise<CompanySettings> {
    await prisma.systemSetting.upsert({ where: { key: 'company_profile' }, update: { value: input }, create: { key: 'company_profile', value: input } })
    return input
  },
}
