type CachedResponse = { key: string; value: unknown; savedAt: number }
type QueuedMutation = { id: string; path: string; method: string; body?: string; createdAt: number }

const DB_NAME = 'ais-company-offline'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains('responses')) db.createObjectStore('responses', { keyPath: 'key' }); if (!db.objectStoreNames.contains('mutations')) db.createObjectStore('mutations', { keyPath: 'id' }) }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function cacheResponse(key: string, value: unknown) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const tx = db.transaction('responses', 'readwrite'); tx.objectStore('responses').put({ key, value, savedAt: Date.now() } satisfies CachedResponse); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }) }
export async function readCachedResponse<T>(key: string): Promise<T | null> { const db = await openDb(); return new Promise((resolve, reject) => { const request = db.transaction('responses').objectStore('responses').get(key); request.onsuccess = () => resolve((request.result as CachedResponse | undefined)?.value as T ?? null); request.onerror = () => reject(request.error) }) }
export async function queueMutation(path: string, method: string, body?: string) { const db = await openDb(); await new Promise<void>((resolve, reject) => { const tx = db.transaction('mutations', 'readwrite'); tx.objectStore('mutations').put({ id: crypto.randomUUID(), path, method, body, createdAt: Date.now() } satisfies QueuedMutation); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }) }
export async function flushMutations(baseUrl: string) { const db = await openDb(); const items = await new Promise<QueuedMutation[]>((resolve, reject) => { const request = db.transaction('mutations').objectStore('mutations').getAll(); request.onsuccess = () => resolve(request.result as QueuedMutation[]); request.onerror = () => reject(request.error) }); for (const item of items.sort((a, b) => a.createdAt - b.createdAt)) { try { const response = await fetch(`${baseUrl}${item.path}`, { method: item.method, body: item.body, credentials: 'include', headers: { 'Content-Type': 'application/json' } }); if (!response.ok) break; await new Promise<void>((resolve, reject) => { const tx = db.transaction('mutations', 'readwrite'); tx.objectStore('mutations').delete(item.id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }) } catch { break } } }
