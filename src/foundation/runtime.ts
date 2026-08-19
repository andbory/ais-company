/**
 * إعدادات عامة آمنة للواجهة فقط.
 * لا تضع هنا DATABASE_URL أو أي secret؛ الواجهة تتعامل مع API فقط.
 */
export const clientRuntime = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appName: 'AIS COMPANY',
  locale: 'ar',
  direction: 'rtl' as const,
} as const

