'use client'

export type PianoAttivo = 'A' | 'B'

export type DisposizioneOffline = {
  tavoli: unknown[]
  stazioni: unknown[]
  immagine?: string
  rotazioneImmagine?: number
}

export type PlanimetriaSyncStatus = 'local' | 'pending' | 'syncing' | 'conflict' | 'blocked'

export type PlanimetriaDraft = {
  eventoId: number
  eventoTitolo?: string
  disposizioneSala: DisposizioneOffline
  disposizioneSalaPianoB: DisposizioneOffline
  pianoAttivo: PianoAttivo
  baseUpdatedAt: string | null
  localUpdatedAt: string
  mutationId: string
  pendingSync: boolean
  syncStatus: PlanimetriaSyncStatus
  conflictServerUpdatedAt?: string | null
}

export type PlanimetriaSyncEventDetail = {
  eventoId: number
  mutationId: string
  status: 'synced' | 'conflict' | 'blocked'
  updatedAt?: string
  current?: unknown
  message?: string
}

export const PLANIMETRIA_SYNC_EVENT = 'villa-paris:planimetria-sync'

const DB_NAME = 'villa-paris-offline'
const DB_VERSION = 1
const STORE_NAME = 'planimetria-drafts'
const FALLBACK_PREFIX = 'villa-paris:planimetria-draft:'

let dbPromise: Promise<IDBDatabase> | null = null
let syncPromise: Promise<void> | null = null

function fallbackKey(eventoId: number) {
  return `${FALLBACK_PREFIX}${eventoId}`
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB non disponibile'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'eventoId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Archivio locale non disponibile'))
  })

  return dbPromise
}

async function idbRequest<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const request = operation(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Operazione locale non riuscita'))
  })
}

function readFallback(eventoId: number): PlanimetriaDraft | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(fallbackKey(eventoId))
    return raw ? JSON.parse(raw) as PlanimetriaDraft : null
  } catch {
    return null
  }
}

function listFallback(): PlanimetriaDraft[] {
  if (typeof localStorage === 'undefined') return []
  const drafts: PlanimetriaDraft[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key?.startsWith(FALLBACK_PREFIX)) continue
    try {
      const raw = localStorage.getItem(key)
      if (raw) drafts.push(JSON.parse(raw) as PlanimetriaDraft)
    } catch {
      // Una singola bozza corrotta non deve impedire il recupero delle altre.
    }
  }
  return drafts
}

export function createPlanimetriaMutationId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function readPlanimetriaDraft(eventoId: number): Promise<PlanimetriaDraft | null> {
  try {
    return (await idbRequest('readonly', (store) => store.get(eventoId))) || null
  } catch {
    return readFallback(eventoId)
  }
}

export async function listPlanimetriaDrafts(): Promise<PlanimetriaDraft[]> {
  try {
    return await idbRequest('readonly', (store) => store.getAll())
  } catch {
    return listFallback()
  }
}

export async function writePlanimetriaDraft(draft: PlanimetriaDraft): Promise<void> {
  try {
    await idbRequest('readwrite', (store) => store.put(draft))
    if (typeof localStorage !== 'undefined') localStorage.removeItem(fallbackKey(draft.eventoId))
  } catch {
    if (typeof localStorage === 'undefined') throw new Error('Impossibile salvare la bozza sul dispositivo')
    localStorage.setItem(fallbackKey(draft.eventoId), JSON.stringify(draft))
  }
}

export async function removePlanimetriaDraft(eventoId: number, expectedMutationId?: string): Promise<boolean> {
  const current = await readPlanimetriaDraft(eventoId)
  if (expectedMutationId && current?.mutationId !== expectedMutationId) return false

  try {
    await idbRequest('readwrite', (store) => store.delete(eventoId))
  } catch {
    // Il fallback viene comunque ripulito qui sotto.
  }
  if (typeof localStorage !== 'undefined') localStorage.removeItem(fallbackKey(eventoId))
  return true
}

export async function clearOfflineWorkspace(): Promise<void> {
  try {
    await idbRequest('readwrite', (store) => store.clear())
  } catch {
    // Il fallback viene ripulito comunque.
  }

  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(FALLBACK_PREFIX) || key === 'villa-paris:last-route') keysToRemove.push(key)
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null)
    registration?.active?.postMessage({ type: 'CLEAR_PRIVATE_DATA' })
  }
}

function emitSyncEvent(detail: PlanimetriaSyncEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<PlanimetriaSyncEventDetail>(PLANIMETRIA_SYNC_EVENT, { detail }))
}

async function updateDraftIfCurrent(draft: PlanimetriaDraft, updates: Partial<PlanimetriaDraft>) {
  const current = await readPlanimetriaDraft(draft.eventoId)
  if (!current || current.mutationId !== draft.mutationId) return
  await writePlanimetriaDraft({ ...current, ...updates })
}

async function runPendingSync() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  const drafts = (await listPlanimetriaDrafts())
    .filter((draft) => draft.pendingSync && draft.syncStatus !== 'conflict')
    .sort((a, b) => a.localUpdatedAt.localeCompare(b.localUpdatedAt))

  for (const draft of drafts) {
    await updateDraftIfCurrent(draft, { syncStatus: 'syncing' })
    try {
      const response = await fetch(`/api/eventi?id=${draft.eventoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposizioneSala: draft.disposizioneSala,
          disposizioneSalaPianoB: draft.disposizioneSalaPianoB,
          pianoAttivo: draft.pianoAttivo,
          _baseUpdatedAt: draft.baseUpdatedAt,
          _clientMutationId: draft.mutationId,
        }),
      })

      if (response.status === 409) {
        const body = await response.json().catch(() => ({}))
        await updateDraftIfCurrent(draft, {
          pendingSync: false,
          syncStatus: 'conflict',
          conflictServerUpdatedAt: body.currentUpdatedAt || null,
        })
        emitSyncEvent({
          eventoId: draft.eventoId,
          mutationId: draft.mutationId,
          status: 'conflict',
          current: body.current,
          updatedAt: body.currentUpdatedAt,
          message: body.message,
        })
        continue
      }

      if (response.status === 423) {
        const body = await response.json().catch(() => ({}))
        await updateDraftIfCurrent(draft, { syncStatus: 'blocked' })
        emitSyncEvent({
          eventoId: draft.eventoId,
          mutationId: draft.mutationId,
          status: 'blocked',
          message: body.message || 'Evento bloccato: serve un override amministrativo.',
        })
        continue
      }

      if (!response.ok) {
        await updateDraftIfCurrent(draft, { syncStatus: 'pending' })
        continue
      }

      const saved = await response.json().catch(() => ({}))
      await removePlanimetriaDraft(draft.eventoId, draft.mutationId)
      emitSyncEvent({
        eventoId: draft.eventoId,
        mutationId: draft.mutationId,
        status: 'synced',
        updatedAt: saved.updatedAt,
      })
    } catch {
      await updateDraftIfCurrent(draft, { syncStatus: 'pending' })
      break
    }
  }
}

export function syncPendingPlanimetrie(): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = runPendingSync().finally(() => {
    syncPromise = null
  })
  return syncPromise
}
