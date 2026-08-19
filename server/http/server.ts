import 'dotenv/config'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { invoiceRepository } from '../invoices/invoice.repository.js'
import type { InvoiceInput, InvoiceUpdateInput } from '../invoices/invoice.validation.js'
import { login } from '../auth/auth.repository.js'
import { clearSessionCookie, findSessionUser, parseSessionCookie, revokeSession, setSessionCookie } from '../auth/session.js'
import { requirePermission } from '../auth/guards.js'
import { validatePartyInput, validatePartySearch } from '../parties/party.validation.js'
import { partyRepository } from '../parties/party.repository.js'
import { validateTransferInput } from '../transfers/transfer.validation.js'
import { transferRepository } from '../transfers/transfer.repository.js'
import { validateSettlementInput } from '../settlements/settlement.validation.js'
import { settlementRepository } from '../settlements/settlement.repository.js'
import { validateOpeningBalanceInput } from '../opening-balances/opening-balance.validation.js'
import { openingBalanceRepository } from '../opening-balances/opening-balance.repository.js'
import { validateReportFilters } from '../reports/report.validation.js'
import { reportRepository } from '../reports/report.repository.js'
import { validateCursor, validateSyncBatch } from '../sync/sync.validation.js'
import { syncRepository } from '../sync/sync.repository.js'
import { backupService } from '../backup/backup.service.js'
import { settingsRepository, validateCompanySettings } from '../settings/settings.repository.js'

const port = Number(process.env.PORT ?? 3001)
const webRoot = path.resolve(process.cwd(), 'dist')

const contentTypes: Record<string, string> = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8' }

async function serveWeb(requestPath: string, response: ServerResponse) {
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '')
  const candidate = path.resolve(webRoot, relativePath)
  if (!candidate.startsWith(`${webRoot}${path.sep}`)) return false
  try {
    const file = await readFile(candidate)
    const extension = path.extname(candidate).toLowerCase()
    response.writeHead(200, { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream', 'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' })
    response.end(file)
    return true
  } catch {
    if (requestPath !== '/') return serveWeb('/', response)
    return false
  }
}

function respond(response: ServerResponse, status: number, body: unknown, request?: IncomingMessage) {
  const origin = request?.headers.origin
  const allowedOrigin = origin === 'http://localhost:5173' || origin === 'http://127.0.0.1:5173' ? origin : undefined
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin ?? 'null',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  })
  response.end(JSON.stringify(body))
}

async function body<T>(request: IncomingMessage): Promise<T> {
  let raw = ''
  for await (const chunk of request) {
    raw += chunk
    if (raw.length > 1_000_000) throw new Error('حجم الطلب كبير جداً.')
  }
  return (raw ? JSON.parse(raw) : {}) as T
}

export const requestHandler = async (request: IncomingMessage, response: ServerResponse) => {
  if (request.method === 'OPTIONS') return respond(response, 204, {}, request)
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  const idMatch = url.pathname.match(/^\/api\/invoices\/([^/]+)$/)
  const partyIdMatch = url.pathname.match(/^\/api\/parties\/([^/]+)$/)
  const transferIdMatch = url.pathname.match(/^\/api\/transfers\/([^/]+)$/)
  const settlementIdMatch = url.pathname.match(/^\/api\/settlements\/([^/]+)$/)
  const openingBalanceIdMatch = url.pathname.match(/^\/api\/opening-balances\/([^/]+)$/)
  const statementPartyMatch = url.pathname.match(/^\/api\/statements\/([^/]+)$/)
  try {
    if (request.method === 'GET' && !url.pathname.startsWith('/api/') && await serveWeb(url.pathname, response)) return
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      const input = await body<{ username?: unknown; password?: unknown }>(request)
      const result = typeof input.username === 'string' && typeof input.password === 'string' ? await login(input.username, input.password) : null
      if (!result) return respond(response, 401, { error: 'بيانات الدخول غير صحيحة.' }, request)
      setSessionCookie(response, result.token, process.env.NODE_ENV === 'production')
      return respond(response, 200, { user: result.user }, request)
    }
    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      const user = await findSessionUser(parseSessionCookie(request))
      return respond(response, user ? 200 : 401, user ? { user } : { error: 'الجلسة غير صالحة.' }, request)
    }
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      await revokeSession(parseSessionCookie(request))
      clearSessionCookie(response, process.env.NODE_ENV === 'production')
      return respond(response, 204, {}, request)
    }
    if (url.pathname === '/api/settings/company' && request.method === 'GET') {
      await requirePermission(request, 'settings:read')
      return respond(response, 200, await settingsRepository.getCompany(), request)
    }
    if (url.pathname === '/api/settings/company' && request.method === 'PUT') {
      await requirePermission(request, 'settings:write')
      return respond(response, 200, await settingsRepository.updateCompany(validateCompanySettings(await body(request))), request)
    }
    if (url.pathname === '/api/parties' && request.method === 'GET') {
      await requirePermission(request, 'parties:read')
      return respond(response, 200, await partyRepository.findAll(validatePartySearch(url.searchParams.get('search'))), request)
    }
    if (url.pathname === '/api/parties' && request.method === 'POST') {
      await requirePermission(request, 'parties:write')
      return respond(response, 201, await partyRepository.create(validatePartyInput(await body(request))), request)
    }
    if (partyIdMatch && request.method === 'GET') {
      await requirePermission(request, 'parties:read')
      const party = await partyRepository.findById(partyIdMatch[1])
      return respond(response, party ? 200 : 404, party ?? { error: 'الجهة غير موجودة.' }, request)
    }
    if (partyIdMatch && request.method === 'PATCH') {
      await requirePermission(request, 'parties:write')
      const party = await partyRepository.update(partyIdMatch[1], validatePartyInput(await body(request)))
      return respond(response, party ? 200 : 404, party ?? { error: 'الجهة غير موجودة.' }, request)
    }
    if (partyIdMatch && request.method === 'DELETE') {
      await requirePermission(request, 'parties:write')
      const archived = await partyRepository.archive(partyIdMatch[1])
      return respond(response, archived ? 204 : 404, archived ? {} : { error: 'الجهة غير موجودة.' }, request)
    }
    if (url.pathname === '/api/transfers' && request.method === 'GET') {
      await requirePermission(request, 'transfers:read')
      return respond(response, 200, await transferRepository.findAll(validatePartySearch(url.searchParams.get('search'))), request)
    }
    if (url.pathname === '/api/transfers' && request.method === 'POST') {
      const user = await requirePermission(request, 'transfers:write')
      return respond(response, 201, await transferRepository.create(validateTransferInput(await body(request)), user.id), request)
    }
    if (transferIdMatch && request.method === 'GET') {
      await requirePermission(request, 'transfers:read')
      const transfer = await transferRepository.findById(transferIdMatch[1])
      return respond(response, transfer ? 200 : 404, transfer ?? { error: 'الحوالة غير موجودة.' }, request)
    }
    if (transferIdMatch && request.method === 'PATCH') {
      const user = await requirePermission(request, 'transfers:write')
      const transfer = await transferRepository.update(transferIdMatch[1], validateTransferInput(await body(request)), user.id)
      return respond(response, transfer ? 200 : 404, transfer ?? { error: 'الحوالة غير موجودة.' }, request)
    }
    if (transferIdMatch && request.method === 'DELETE') {
      const user = await requirePermission(request, 'transfers:delete')
      const archived = await transferRepository.archive(transferIdMatch[1], user.id)
      return respond(response, archived ? 204 : 404, archived ? {} : { error: 'الحوالة غير موجودة.' }, request)
    }
    if (url.pathname === '/api/settlements' && request.method === 'GET') {
      await requirePermission(request, 'settlements:read')
      return respond(response, 200, await settlementRepository.findAll(validatePartySearch(url.searchParams.get('search'))), request)
    }
    if (url.pathname === '/api/settlements' && request.method === 'POST') {
      const user = await requirePermission(request, 'settlements:write')
      return respond(response, 201, await settlementRepository.create(validateSettlementInput(await body(request)), user.id), request)
    }
    if (settlementIdMatch && request.method === 'GET') {
      await requirePermission(request, 'settlements:read')
      const settlement = await settlementRepository.findById(settlementIdMatch[1])
      return respond(response, settlement ? 200 : 404, settlement ?? { error: 'التسوية غير موجودة.' }, request)
    }
    if (settlementIdMatch && request.method === 'PATCH') {
      const user = await requirePermission(request, 'settlements:write')
      const settlement = await settlementRepository.update(settlementIdMatch[1], validateSettlementInput(await body(request)), user.id)
      return respond(response, settlement ? 200 : 404, settlement ?? { error: 'التسوية غير موجودة.' }, request)
    }
    if (settlementIdMatch && request.method === 'DELETE') {
      const user = await requirePermission(request, 'settlements:write')
      const archived = await settlementRepository.archive(settlementIdMatch[1], user.id)
      return respond(response, archived ? 204 : 404, archived ? {} : { error: 'التسوية غير موجودة.' }, request)
    }
    if (url.pathname === '/api/opening-balances' && request.method === 'GET') {
      await requirePermission(request, 'opening-balances:read')
      return respond(response, 200, await openingBalanceRepository.findAll(), request)
    }
    if (url.pathname === '/api/opening-balances' && request.method === 'POST') {
      await requirePermission(request, 'opening-balances:write')
      return respond(response, 201, await openingBalanceRepository.upsert(validateOpeningBalanceInput(await body(request))), request)
    }
    if (openingBalanceIdMatch && request.method === 'DELETE') {
      await requirePermission(request, 'opening-balances:write')
      const deleted = await openingBalanceRepository.delete(openingBalanceIdMatch[1])
      return respond(response, deleted ? 204 : 404, deleted ? {} : { error: 'الرصيد الافتتاحي غير موجود.' }, request)
    }
    if (url.pathname === '/api/accounts' && request.method === 'GET') {
      await requirePermission(request, 'reports:read')
      const filters = validateReportFilters(url.searchParams)
      return respond(response, 200, await reportRepository.accounts(filters), request)
    }
    if (url.pathname === '/api/reports/dashboard' && request.method === 'GET') {
      await requirePermission(request, 'reports:read')
      return respond(response, 200, await reportRepository.dashboard(validateReportFilters(url.searchParams)), request)
    }
    if (url.pathname === '/api/reports/transfers' && request.method === 'GET') {
      await requirePermission(request, 'reports:read')
      return respond(response, 200, await reportRepository.transferReport(validateReportFilters(url.searchParams)), request)
    }
    if (url.pathname === '/api/reports/settlements' && request.method === 'GET') {
      await requirePermission(request, 'reports:read')
      return respond(response, 200, await reportRepository.settlementReport(validateReportFilters(url.searchParams)), request)
    }
    if (statementPartyMatch && request.method === 'GET') {
      await requirePermission(request, 'reports:read')
      const filters = validateReportFilters(url.searchParams)
      if (!/^[0-9a-f-]{36}$/i.test(statementPartyMatch[1])) throw new Error('معرّف الجهة غير صالح.')
      return respond(response, 200, await reportRepository.statement(statementPartyMatch[1], filters), request)
    }
    if (url.pathname === '/api/sync/push' && request.method === 'POST') {
      const user = await requirePermission(request, 'sync:write')
      const input = await body<{ mutations?: unknown }>(request)
      return respond(response, 200, { mutations: await syncRepository.push(validateSyncBatch(input.mutations), user.id) }, request)
    }
    if (url.pathname === '/api/sync/pull' && request.method === 'GET') {
      const user = await requirePermission(request, 'sync:read')
      return respond(response, 200, await syncRepository.pull(user.id, validateCursor(url.searchParams.get('cursor'))), request)
    }
    if (url.pathname === '/api/sync/acknowledge' && request.method === 'POST') {
      const user = await requirePermission(request, 'sync:write')
      const input = await body<{ mutationIds?: unknown }>(request)
      if (!Array.isArray(input.mutationIds) || input.mutationIds.length > 100 || input.mutationIds.some((id) => typeof id !== 'string')) throw new Error('معرّفات التأكيد غير صالحة.')
      return respond(response, 200, { acknowledged: await syncRepository.acknowledge(user.id, input.mutationIds) }, request)
    }
    if (url.pathname === '/api/backups' && request.method === 'GET') {
      await requirePermission(request, 'backup:read')
      const backups = await backupService.list()
      return respond(response, 200, backups.map((backup) => ({ ...backup, sizeBytes: backup.sizeBytes?.toString() ?? null })), request)
    }
    if (url.pathname === '/api/backups' && request.method === 'POST') {
      const user = await requirePermission(request, 'backup:write')
      const backup = await backupService.start(user.id)
      return respond(response, 201, { ...backup, sizeBytes: backup.sizeBytes?.toString() ?? null }, request)
    }
    if (url.pathname === '/api/invoices' && request.method === 'GET') { await requirePermission(request, 'transfers:read'); return respond(response, 200, await invoiceRepository.findAll(), request) }
    if (url.pathname === '/api/invoices' && request.method === 'POST') { await requirePermission(request, 'transfers:write'); return respond(response, 201, await invoiceRepository.create(await body<InvoiceInput>(request)), request) }
    if (idMatch && request.method === 'GET') { await requirePermission(request, 'transfers:read'); return respond(response, 200, await invoiceRepository.findById(idMatch[1]) ?? { error: 'الفاتورة غير موجودة.' }, request) }
    if (idMatch && request.method === 'PATCH') { await requirePermission(request, 'transfers:write'); return respond(response, 200, await invoiceRepository.update(idMatch[1], await body<InvoiceUpdateInput>(request)) ?? { error: 'الفاتورة غير موجودة.' }, request) }
    if (idMatch && request.method === 'DELETE') { await requirePermission(request, 'transfers:delete'); await invoiceRepository.delete(idMatch[1]); return respond(response, 204, {}, request) }
    return respond(response, 404, { error: 'المسار غير موجود.' }, request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'
    console.error('[invoice-api]', error)
    const status = message === 'AUTH_REQUIRED' ? 401 : message.includes('ليس لديك صلاحية') ? 403 : message.includes('Unique constraint') ? 409 : message.includes('غير صالح') || message.includes('يجب') || message.includes('مطلوب') || message.includes('يتجاوز') || message.includes('لا يمكن') ? 400 : 500
    return respond(response, status, { error: status === 409 ? 'رقم الفاتورة مستخدم مسبقاً.' : status === 400 ? message : status === 401 ? 'يجب تسجيل الدخول أولاً.' : status === 403 ? 'ليس لديك صلاحية لتنفيذ هذه العملية.' : 'تعذر تنفيذ العملية.' }, request)
  }
}

if (process.env.VERCEL !== '1') createServer(requestHandler).listen(port, () => console.log(`Invoice API listening on http://localhost:${port}`))
