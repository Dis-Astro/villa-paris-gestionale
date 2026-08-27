'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import VillaPiantina from '@/components/VillaPiantina'
import { type VariantId, calcolaRiepilogoVarianti, VARIANTI_DEFAULT } from '@/lib/types'
import BannerBlocco, { getOverrideHeaders } from '@/components/BannerBlocco'
import {
  PLANIMETRIA_SYNC_EVENT,
  createPlanimetriaMutationId,
  readPlanimetriaDraft,
  removePlanimetriaDraft,
  syncPendingPlanimetrie,
  writePlanimetriaDraft,
  type PlanimetriaDraft,
  type PlanimetriaSyncEventDetail,
} from '@/lib/planimetria-offline'
import jsPDF from 'jspdf'
import { 
  Layout, 
  Save, 
  ArrowLeft, 
  UtensilsCrossed,
  Info,
  Printer,
  Image,
  FileText,
  Star
} from 'lucide-react'

export default function GestionePiantinaPage() {
  const { id } = useParams()
  const eventoId = Number(id)
  const router = useRouter()
  const [evento, setEvento] = useState<any>(null)
  const [infoBlocco, setInfoBlocco] = useState<any>(null)
  const [disposizione, setDisposizione] = useState<{ tavoli: any[], stazioni: any[], immagine?: string, rotazioneImmagine?: number }>({ tavoli: [], stazioni: [], immagine: undefined, rotazioneImmagine: 0 })
  const [disposizionePianoB, setDisposizionePianoB] = useState<{ tavoli: any[], stazioni: any[], immagine?: string, rotazioneImmagine?: number }>({ tavoli: [], stazioni: [], immagine: undefined, rotazioneImmagine: 0 })
  const [pianoAttivo, setPianoAttivo] = useState<'A' | 'B'>('A')
  const [planimetrie, setPlanimetrie] = useState<{ nome: string; url: string }[]>([])
  const [eventiSimili, setEventiSimili] = useState<any[]>([])
  const [schemaDaCopiareId, setSchemaDaCopiareId] = useState('')
  const [preferitiSchemaIds, setPreferitiSchemaIds] = useState<number[]>([])
  const [variantiAttive, setVariantiAttive] = useState<VariantId[]>([])
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [baseUpdatedAt, setBaseUpdatedAt] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [syncState, setSyncState] = useState<'synced' | 'local' | 'pending' | 'syncing' | 'offline' | 'conflict' | 'blocked'>('synced')
  const [conflictServerEvent, setConflictServerEvent] = useState<any>(null)
  const stampaRef = useRef<HTMLDivElement>(null)
  const draftMutationIdRef = useRef<string | null>(null)

  const aggiornaDisposizione = useCallback((nuova: any) => {
    const cloned = JSON.parse(JSON.stringify(nuova))
    if (pianoAttivo === 'B') {
      setDisposizionePianoB(cloned)
    } else {
      setDisposizione(cloned)
    }
    setHasChanges(true)
  }, [pianoAttivo])

  const parseDisposizione = (raw: any) => {
    const parsed = typeof raw === 'string'
      ? (() => {
          try { return JSON.parse(raw || '{}') } catch { return {} }
        })()
      : raw

    return {
      tavoli: Array.isArray(parsed?.tavoli) ? parsed.tavoli : [],
      stazioni: Array.isArray(parsed?.stazioni) ? parsed.stazioni : [],
      immagine: parsed?.immagine ?? undefined,
      rotazioneImmagine: parsed?.rotazioneImmagine || 0
    }
  }

  const fetchPlanimetrie = useCallback(async () => {
    try {
      const res = await fetch('/api/piantine')
      const data = await res.json()
      setPlanimetrie(Array.isArray(data) ? data : [])
    } catch {
      setPlanimetrie([])
    }
  }, [])

  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const res = await fetch(`/api/eventi?id=${id}`)
        if (!res.ok) {
          console.error('Errore nel caricamento evento:', res.status)
          return
        }
        const data = await res.json()
        setEvento(data)
        if (data._blocco) setInfoBlocco(data._blocco)
        
        if (data.menu?.variantiAttive) {
          setVariantiAttive(data.menu.variantiAttive)
        }

        const serverDisposizione = parseDisposizione(data.disposizioneSala)
        const serverDisposizionePianoB = parseDisposizione(data.disposizioneSalaPianoB)
        setDisposizione(serverDisposizione)
        setDisposizionePianoB(serverDisposizionePianoB)
        setPianoAttivo(data.pianoAttivo === 'B' ? 'B' : 'A')
        setBaseUpdatedAt(data.updatedAt || null)
        setHasChanges(false)

        const draft = await readPlanimetriaDraft(eventoId)
        const serverUpdatedAt = Date.parse(data.updatedAt || '') || 0
        const draftUpdatedAt = draft ? Date.parse(draft.localUpdatedAt) || 0 : 0
        const shouldRestoreDraft = Boolean(
          draft && (
            draft.pendingSync ||
            draft.syncStatus === 'conflict' ||
            draft.syncStatus === 'blocked' ||
            draftUpdatedAt > serverUpdatedAt
          )
        )

        if (draft && shouldRestoreDraft) {
          setDisposizione(parseDisposizione(draft.disposizioneSala))
          setDisposizionePianoB(parseDisposizione(draft.disposizioneSalaPianoB))
          setPianoAttivo(draft.pianoAttivo)
          setBaseUpdatedAt(draft.baseUpdatedAt || data.updatedAt || null)
          setHasChanges(true)
          draftMutationIdRef.current = draft.mutationId

          if (draft.syncStatus === 'conflict') {
            setSyncState('conflict')
            setConflictServerEvent(data)
            setStatus('⚠️ Conflitto rilevato: la bozza locale è stata ripristinata senza sovrascrivere il server.')
          } else if (draft.syncStatus === 'blocked') {
            setSyncState('blocked')
            setStatus('🔒 Bozza locale ripristinata. Per inviarla serve un override amministrativo.')
          } else if (draft.pendingSync) {
            setSyncState(navigator.onLine ? 'pending' : 'offline')
            setStatus(navigator.onLine ? 'Invio della bozza locale in corso…' : 'Bozza locale ripristinata. Verrà inviata al ritorno della rete.')
            if (navigator.onLine) void syncPendingPlanimetrie()
          } else {
            setSyncState(navigator.onLine ? 'local' : 'offline')
            setStatus('Bozza locale ripristinata su questo dispositivo.')
          }
        } else if (draft) {
          await removePlanimetriaDraft(eventoId, draft.mutationId)
        }
      } catch (error) {
        console.error('Errore nel caricamento evento:', error)
      }
    }
    fetchEvento()
    fetchPlanimetrie()
  }, [id, fetchPlanimetrie])

  useEffect(() => {
    const raw = localStorage.getItem('schema_preferiti_ids')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) setPreferitiSchemaIds(parsed.map((x) => Number(x)).filter(Boolean))
      } catch {
        setPreferitiSchemaIds([])
      }
    }
  }, [])

  useEffect(() => {
    const updateConnectionState = () => {
      const online = navigator.onLine
      setIsOnline(online)

      if (!online) {
        setSyncState((current) => current === 'conflict' || current === 'blocked' ? current : 'offline')
        return
      }

      void readPlanimetriaDraft(eventoId).then((draft) => {
        setSyncState((current) => {
          if (current === 'conflict' || current === 'blocked') return current
          if (draft?.pendingSync) return 'pending'
          return hasChanges ? 'local' : 'synced'
        })
        if (draft?.pendingSync) void syncPendingPlanimetrie()
      })
    }

    updateConnectionState()
    window.addEventListener('online', updateConnectionState)
    window.addEventListener('offline', updateConnectionState)
    return () => {
      window.removeEventListener('online', updateConnectionState)
      window.removeEventListener('offline', updateConnectionState)
    }
  }, [eventoId, hasChanges])

  useEffect(() => {
    const handleSyncEvent = (event: Event) => {
      const detail = (event as CustomEvent<PlanimetriaSyncEventDetail>).detail
      if (!detail || detail.eventoId !== eventoId) return
      if (draftMutationIdRef.current && detail.mutationId !== draftMutationIdRef.current) return

      if (detail.status === 'synced') {
        if (detail.updatedAt) {
          setBaseUpdatedAt(detail.updatedAt)
          setEvento((current: any) => current ? { ...current, updatedAt: detail.updatedAt } : current)
        }
        setHasChanges(false)
        setLastSavedAt(new Date())
        setSyncState('synced')
        setConflictServerEvent(null)
        setStatus('✅ Bozza locale sincronizzata con il server')
        draftMutationIdRef.current = null
        setTimeout(() => setStatus(''), 2500)
      } else if (detail.status === 'conflict') {
        setSyncState('conflict')
        setConflictServerEvent(detail.current || null)
        setStatus('⚠️ Il PC o un altro iPad ha salvato una versione più recente. La tua bozza è al sicuro.')
      } else if (detail.status === 'blocked') {
        setSyncState('blocked')
        setStatus(`🔒 ${detail.message || 'Evento bloccato: serve un override amministrativo.'}`)
      }
    }

    window.addEventListener(PLANIMETRIA_SYNC_EVENT, handleSyncEvent)
    return () => window.removeEventListener(PLANIMETRIA_SYNC_EVENT, handleSyncEvent)
  }, [eventoId])

  useEffect(() => {
    if (!evento || !hasChanges) return

    const timer = window.setTimeout(() => {
      void (async () => {
        const existing = await readPlanimetriaDraft(eventoId)
        const mutationId = createPlanimetriaMutationId()
        const pendingSync = Boolean(existing?.pendingSync)
        const preservedStatus = existing?.syncStatus === 'conflict' || existing?.syncStatus === 'blocked'
          ? existing.syncStatus
          : pendingSync ? 'pending' : 'local'

        const draft: PlanimetriaDraft = {
          eventoId,
          eventoTitolo: evento.titolo,
          disposizioneSala: disposizione,
          disposizioneSalaPianoB: disposizionePianoB,
          pianoAttivo,
          baseUpdatedAt,
          localUpdatedAt: new Date().toISOString(),
          mutationId,
          pendingSync,
          syncStatus: preservedStatus,
          conflictServerUpdatedAt: existing?.conflictServerUpdatedAt,
        }

        await writePlanimetriaDraft(draft)
        draftMutationIdRef.current = mutationId
        setSyncState((current) => {
          if (current === 'conflict' || current === 'blocked') return current
          if (!navigator.onLine) return 'offline'
          return pendingSync ? 'pending' : 'local'
        })
      })()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [baseUpdatedAt, disposizione, disposizionePianoB, evento, eventoId, hasChanges, pianoAttivo])

  useEffect(() => {
    localStorage.setItem('schema_preferiti_ids', JSON.stringify(preferitiSchemaIds))
  }, [preferitiSchemaIds])

  useEffect(() => {
    const fetchEventiSimili = async () => {
      if (!evento?.tipo) return
      try {
        const res = await fetch('/api/eventi')
        const data = await res.json()
        if (!Array.isArray(data)) return

        const candidati = data
          .filter((ev: any) => Number(ev.id) !== eventoId)
          .map((ev: any) => ({ ...ev, _disposizioneParsed: parseDisposizione(ev.disposizioneSala) }))
          .filter((ev: any) => ev._disposizioneParsed.tavoli.length > 0)
          .sort((a: any, b: any) => {
            const aScore = Math.abs((a.personePreviste || 0) - (evento.personePreviste || 0))
            const bScore = Math.abs((b.personePreviste || 0) - (evento.personePreviste || 0))
            const sameTypeA = a.tipo === evento.tipo ? -1000 : 0
            const sameTypeB = b.tipo === evento.tipo ? -1000 : 0
            return (aScore + sameTypeA) - (bScore + sameTypeB)
          })
          .slice(0, 15)

        setEventiSimili(candidati)
      } catch {
        setEventiSimili([])
      }
    }
    fetchEventiSimili()
  }, [evento?.tipo, evento?.personePreviste, eventoId])

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!hasChanges) return
      event.preventDefault()
    }
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('beforeunload', warnUnsaved)
    window.addEventListener('keydown', handleSaveShortcut)
    return () => {
      window.removeEventListener('beforeunload', warnUnsaved)
      window.removeEventListener('keydown', handleSaveShortcut)
    }
  })

  const handleUploadPlanimetriaGlobale = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('nome', file.name)

    const res = await fetch('/api/piantine', {
      method: 'POST',
      body: formData
    })

    if (res.ok) {
      await fetchPlanimetrie()
      setStatus('✅ Planimetria salvata in libreria')
      setTimeout(() => setStatus(''), 2000)
    } else {
      setStatus('❌ Errore salvataggio planimetria in libreria')
    }
  }

  const handleCopiaSchema = () => {
    const selected = eventiSimili.find((e) => String(e.id) === schemaDaCopiareId)
    if (!selected) return
    const parsed = parseDisposizione(selected.disposizioneSala)
    if (pianoAttivo === 'B') {
      setDisposizionePianoB(parsed)
    } else {
      setDisposizione(parsed)
    }
    setHasChanges(true)
    setStatus(`Schema copiato da evento #${selected.id} nel Piano ${pianoAttivo}`)
    setTimeout(() => setStatus(''), 2000)
  }

  const togglePreferitoSchema = (eventoIdToToggle: number) => {
    setPreferitiSchemaIds((prev) =>
      prev.includes(eventoIdToToggle)
        ? prev.filter((id) => id !== eventoIdToToggle)
        : [...prev, eventoIdToToggle]
    )
  }

  const addPreferitoSchema = (eventoIdToAdd: number) => {
    setPreferitiSchemaIds((prev) =>
      prev.includes(eventoIdToAdd) ? prev : [...prev, eventoIdToAdd]
    )
  }

  const handleDeletePlanimetriaGlobale = async (url: string) => {
    const res = await fetch(`/api/piantine?url=${encodeURIComponent(url)}`, { method: 'DELETE' })
    if (res.ok) {
      await fetchPlanimetrie()
      setStatus('✅ Planimetria eliminata dalla libreria')
      setTimeout(() => setStatus(''), 2000)
    } else {
      setStatus('❌ Errore eliminazione planimetria')
    }
  }

  const loadImage = (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  const saveCurrentDraft = async (baseVersionOverride?: string | null) => {
    if (!evento || isSaving) return
    setIsSaving(true)
    setStatus(navigator.onLine ? 'Salvataggio in corso...' : 'Salvataggio locale in corso...')
    setSyncState(navigator.onLine ? 'syncing' : 'offline')
    const overrideHeaders = getOverrideHeaders()
    const mutationId = createPlanimetriaMutationId()
    const draft: PlanimetriaDraft = {
      eventoId,
      eventoTitolo: evento.titolo,
      disposizioneSala: disposizione,
      disposizioneSalaPianoB: disposizionePianoB,
      pianoAttivo,
      baseUpdatedAt: baseVersionOverride === undefined ? baseUpdatedAt : baseVersionOverride,
      localUpdatedAt: new Date().toISOString(),
      mutationId,
      pendingSync: true,
      syncStatus: 'pending',
    }

    try {
      await writePlanimetriaDraft(draft)
      draftMutationIdRef.current = mutationId

      if (!navigator.onLine) {
        setSyncState('offline')
        setStatus('📱 Salvato su questo iPad. Verrà inviato automaticamente quando torna la rete.')
        return
      }

      const res = await fetch(`/api/eventi?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...overrideHeaders },
        body: JSON.stringify({
          disposizioneSala: disposizione,
          disposizioneSalaPianoB: disposizionePianoB,
          pianoAttivo,
          _baseUpdatedAt: draft.baseUpdatedAt,
          _clientMutationId: mutationId,
        })
      })

      if (res.status === 409) {
        const body = await res.json().catch(() => ({}))
        const currentDraft = await readPlanimetriaDraft(eventoId)
        if (currentDraft?.mutationId === mutationId) {
          await writePlanimetriaDraft({
            ...currentDraft,
            pendingSync: false,
            syncStatus: 'conflict',
            conflictServerUpdatedAt: body.currentUpdatedAt || null,
          })
        }
        setConflictServerEvent(body.current || null)
        setSyncState('conflict')
        setStatus('⚠️ Un altro dispositivo ha salvato una versione più recente. La tua bozza non è stata sovrascritta.')
      } else if (res.status === 423) {
        const body = await res.json()
        const currentDraft = await readPlanimetriaDraft(eventoId)
        if (currentDraft?.mutationId === mutationId) {
          await writePlanimetriaDraft({ ...currentDraft, pendingSync: false, syncStatus: 'blocked' })
        }
        setSyncState('blocked')
        setStatus(`🔒 ${body.message || 'Evento bloccato: serve override amministrativo.'}`)
      } else {
        if (res.ok) {
          const saved = await res.json().catch(() => ({}))
          await removePlanimetriaDraft(eventoId, mutationId)
          if (saved.updatedAt) {
            setBaseUpdatedAt(saved.updatedAt)
            setEvento((current: any) => current ? { ...current, updatedAt: saved.updatedAt } : current)
          }
          setHasChanges(false)
          setLastSavedAt(new Date())
          setConflictServerEvent(null)
          setSyncState('synced')
          draftMutationIdRef.current = null
          setStatus('✅ Salvato e sincronizzato')
        } else {
          const currentDraft = await readPlanimetriaDraft(eventoId)
          if (currentDraft?.mutationId === mutationId) {
            await writePlanimetriaDraft({ ...currentDraft, pendingSync: true, syncStatus: 'pending' })
          }
          setSyncState('pending')
          setStatus('Invio non riuscito. La bozza è al sicuro e resta in coda.')
        }
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      const currentDraft = await readPlanimetriaDraft(eventoId).catch(() => null)
      if (currentDraft?.mutationId === mutationId) {
        await writePlanimetriaDraft({ ...currentDraft, pendingSync: true, syncStatus: 'pending' }).catch(() => {})
      }
      setSyncState(navigator.onLine ? 'pending' : 'offline')
      setStatus('📱 Connessione assente o instabile: la bozza è salvata sul dispositivo e resta in coda.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = () => saveCurrentDraft()

  const handleUseServerVersion = async () => {
    let current = conflictServerEvent
    if (!current) {
      const response = await fetch(`/api/eventi?id=${id}`)
      if (!response.ok) return
      current = await response.json()
    }

    setEvento(current)
    setDisposizione(parseDisposizione(current.disposizioneSala))
    setDisposizionePianoB(parseDisposizione(current.disposizioneSalaPianoB))
    setPianoAttivo(current.pianoAttivo === 'B' ? 'B' : 'A')
    setBaseUpdatedAt(current.updatedAt || null)
    setConflictServerEvent(null)
    setHasChanges(false)
    setSyncState('synced')
    draftMutationIdRef.current = null
    await removePlanimetriaDraft(eventoId)
    setStatus('Versione del server caricata. La bozza locale è stata rimossa.')
    setTimeout(() => setStatus(''), 2500)
  }

  const handleKeepLocalVersion = async () => {
    let serverUpdatedAt = conflictServerEvent?.updatedAt || null
    if (!serverUpdatedAt) {
      const response = await fetch(`/api/eventi?id=${id}`)
      if (!response.ok) return
      const current = await response.json()
      serverUpdatedAt = current.updatedAt || null
    }
    setConflictServerEvent(null)
    setBaseUpdatedAt(serverUpdatedAt)
    setSyncState('local')
    await saveCurrentDraft(serverUpdatedAt)
  }

  const generateCanvas = async () => {
    const width = 1920
    const height = 1080
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    if (disposizioneCorrente?.immagine) {
      try {
        const img = await loadImage(disposizioneCorrente.immagine)
        const scale = Math.max(width / img.width, height / img.height)
        const drawW = img.width * scale
        const drawH = img.height * scale
        const x = (width - drawW) / 2
        const y = (height - drawH) / 2
        ctx.drawImage(img, x, y, drawW, drawH)
      } catch {
        // se immagine non caricabile, continua con sfondo bianco
      }
    }

    // Stazioni
    for (const stazione of disposizioneCorrente?.stazioni || []) {
      const x = (stazione.posizione?.xPerc || 0) * width
      const y = (stazione.posizione?.yPerc || 0) * height
      const w = (stazione.dimensionePerc?.larghezzaPerc || 0.15) * width
      const h = (stazione.dimensionePerc?.altezzaPerc || 0.06) * height

      ctx.save()
      ctx.translate(x + w / 2, y + h / 2)
      ctx.rotate(((stazione.rotazione || 0) * Math.PI) / 180)
      ctx.fillStyle = '#e9f7ef'
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2
      const radius = 12
      ctx.beginPath()
      ctx.moveTo(-w / 2 + radius, -h / 2)
      ctx.lineTo(w / 2 - radius, -h / 2)
      ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius)
      ctx.lineTo(w / 2, h / 2 - radius)
      ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2)
      ctx.lineTo(-w / 2 + radius, h / 2)
      ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius)
      ctx.lineTo(-w / 2, -h / 2 + radius)
      ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + radius, -h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#111827'
      ctx.font = `${Math.max(14, h * 0.45)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(stazione.nome || 'Stazione', 0, 0)
      ctx.restore()
    }

    // Tavoli
    for (const tavolo of disposizioneCorrente?.tavoli || []) {
      const x = (tavolo.posizione?.xPerc || 0) * width
      const y = (tavolo.posizione?.yPerc || 0) * height
      const diameter = (tavolo.dimensionePerc || 0.03) * width
      const isImperiale = tavolo.forma === 'imperiale'
      const tW = isImperiale ? diameter * 3 : diameter
      const tH = isImperiale ? diameter * 0.8 : diameter

      ctx.save()
      ctx.translate(x + tW / 2, y + tH / 2)
      ctx.rotate(((tavolo.rotazione || 0) * Math.PI) / 180)

      if (isImperiale) {
        // Rettangolo arrotondato per imperiale
        ctx.fillStyle = '#fef3c7'
        ctx.strokeStyle = '#b45309'
        ctx.lineWidth = 2
        const r = 8
        ctx.beginPath()
        ctx.moveTo(-tW / 2 + r, -tH / 2)
        ctx.lineTo(tW / 2 - r, -tH / 2)
        ctx.quadraticCurveTo(tW / 2, -tH / 2, tW / 2, -tH / 2 + r)
        ctx.lineTo(tW / 2, tH / 2 - r)
        ctx.quadraticCurveTo(tW / 2, tH / 2, tW / 2 - r, tH / 2)
        ctx.lineTo(-tW / 2 + r, tH / 2)
        ctx.quadraticCurveTo(-tW / 2, tH / 2, -tW / 2, tH / 2 - r)
        ctx.lineTo(-tW / 2, -tH / 2 + r)
        ctx.quadraticCurveTo(-tW / 2, -tH / 2, -tW / 2 + r, -tH / 2)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        // Cerchio per tavolo rotondo
        const radius = diameter / 2
        ctx.fillStyle = '#f9fafb'
        ctx.strokeStyle = '#6b7280'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }

      ctx.fillStyle = isImperiale ? '#92400e' : '#111827'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${Math.max(11, diameter * 0.25)}px sans-serif`
      ctx.fillText(tavolo.numero || `T${tavolo.id}`, 0, -Math.max(4, diameter * 0.08))

      ctx.fillStyle = '#4b5563'
      ctx.font = `${Math.max(9, diameter * 0.16)}px sans-serif`
      ctx.fillText(`${tavolo.posti || 0}p`, 0, Math.max(8, diameter * 0.18))
      ctx.restore()
    }

    return canvas
  }

  const handleExportPng = async () => {
    try {
      const canvas = await generateCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = imgData
      a.download = `planimetria-evento-${id}.png`
      a.click()
    } catch (error) {
      console.error('Errore export PNG:', error)
      setStatus('❌ Errore export PNG planimetria')
    }
  }

  const handleExportPdf = async () => {
    try {
      const canvas = await generateCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      pdf.addImage(imgData, 'PNG', 8, 8, pageWidth - 16, pageHeight - 16, undefined, 'FAST')
      pdf.save(`planimetria-evento-${id}.pdf`)
    } catch (error) {
      console.error('Errore export PDF:', error)
      setStatus('❌ Errore export PDF planimetria')
    }
  }

  const handleStampaPlanimetria = async () => {
    try {
      const canvas = await generateCanvas()
      if (!canvas) return
      const imgData = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>Planimetria Evento</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;background:#fff;">
              <img src="${imgData}" style="max-width:100%;height:auto;"/>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 300)
      }
    } catch (error) {
      console.error('Errore stampa planimetria:', error)
      setStatus('❌ Errore stampa planimetria')
    }
  }

  const disposizioneCorrente = pianoAttivo === 'B' ? disposizionePianoB : disposizione
  const riepilogo = calcolaRiepilogoVarianti(disposizioneCorrente)
  const eventiPreferiti = eventiSimili.filter((ev) => preferitiSchemaIds.includes(Number(ev.id)))
  const visibleSyncState = !isOnline && syncState !== 'conflict' && syncState !== 'blocked' ? 'offline' : syncState
  const syncStatusLabel = visibleSyncState === 'synced' ? 'Sincronizzato'
    : visibleSyncState === 'local' ? 'Bozza locale'
      : visibleSyncState === 'pending' ? 'In attesa di invio'
        : visibleSyncState === 'syncing' ? 'Sincronizzazione…'
          : visibleSyncState === 'offline' ? 'Offline · al sicuro'
            : visibleSyncState === 'conflict' ? 'Conflitto protetto'
              : 'Serve autorizzazione'

  if (!evento) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="piantina-page">
      {/* Header */}
      <div className="order-1 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/modifica-evento/${id}`)}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna all'evento
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#173c37]" data-testid="piantina-title">
            <Layout className="h-7 w-7 text-[#a67832]" />
            Disposizione Sala
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{evento.titolo}</span>
            {hasChanges ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f8f1e1] px-2 py-1 text-xs font-medium text-[#765c26]"><span className="h-1.5 w-1.5 rounded-full bg-[#c9a96a]" /> Modifiche da salvare</span>
            ) : lastSavedAt ? (
              <span className="text-xs text-[#4f7e70]">Salvato alle {lastSavedAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportPng} data-testid="export-png-piantina-btn">
            <Image className="w-4 h-4 mr-2" />
            PNG
          </Button>
          <Button variant="outline" onClick={handleExportPdf} data-testid="export-pdf-piantina-btn">
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleStampaPlanimetria} data-testid="print-piantina-btn">
            <Printer className="w-4 h-4 mr-2" />
            Stampa
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/eventi/${id}/menu`)}
            data-testid="piantina-open-menu-btn"
          >
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`${hasChanges ? 'bg-[#a67832] hover:bg-[#8c6328]' : 'bg-[#173c37] hover:bg-[#214f48]'} min-w-32 text-white`}
            data-testid="save-piantina-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`order-2 px-4 py-2 rounded-lg text-sm ${
          status.includes('✅') ? 'bg-green-50 text-green-700' : status.includes('🔒') ? 'bg-amber-50 text-amber-700' : status.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`} data-testid="status-message">
          {status}
        </div>
      )}

      {syncState === 'conflict' && (
        <div className="order-2 flex flex-col gap-3 rounded-xl border border-[#d89b78]/45 bg-[#fff8f4] px-4 py-3 text-sm text-[#7a3d2b] sm:flex-row sm:items-center" data-testid="piantina-page-conflict-banner">
          <p className="flex-1"><strong>Modifica contemporanea:</strong> la bozza di questo dispositivo è stata conservata. Scegli quale versione continuare a usare.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleUseServerVersion}>Usa server</Button>
            <Button onClick={handleKeepLocalVersion} className="bg-[#a67832] text-white hover:bg-[#8c6328]">Mantieni questo dispositivo</Button>
          </div>
        </div>
      )}

      {infoBlocco && (
        <div className="order-2">
          <BannerBlocco
            infoBlocco={infoBlocco}
            onOverrideSuccess={() => setStatus('🔓 Override attivato. Ora puoi salvare la planimetria.')}
          />
        </div>
      )}

      {/* Riepilogo varianti */}
      {riepilogo.tavoliConVarianti > 0 && (
        <Card className="order-5 bg-blue-50 border-blue-200" data-testid="riepilogo-varianti">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📊 Riepilogo Varianti</h3>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-blue-800">
                {riepilogo.tavoliConVarianti} tavoli con varianti
              </span>
              {Object.entries(riepilogo.perVariante).map(([variantId, count]) => {
                const variante = VARIANTI_DEFAULT[variantId as VariantId]
                if (!variante || !count) return null
                return (
                  <span 
                    key={variantId}
                    className="px-2 py-1 rounded-full text-white text-xs font-medium"
                    style={{ backgroundColor: variante.colore }}
                  >
                    {variante.nomeStampa}: {count}
                  </span>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle Piano A / Piano B */}
      <Card className="order-3 border-[#c9a96a]/35 bg-[#fbf7ee]" data-testid="piano-ab-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Piano Sala</h3>
              <p className="text-xs text-gray-500 mt-0.5">Gestisci due configurazioni alternative (es. interno/esterno, pioggia/sole)</p>
            </div>
            <div className="flex gap-1 bg-white rounded-lg border p-1" data-testid="piano-ab-toggle">
              <button
                onClick={() => { setPianoAttivo('A'); setHasChanges(true) }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${pianoAttivo === 'A' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                data-testid="piano-a-btn"
              >
                Piano A
              </button>
              <button
                onClick={() => { setPianoAttivo('B'); setHasChanges(true) }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${pianoAttivo === 'B' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                data-testid="piano-b-btn"
              >
                Piano B
              </button>
            </div>
          </div>
          {pianoAttivo === 'B' && (
            <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded px-3 py-1.5 border border-blue-200" data-testid="piano-b-active-banner">
              Stai modificando il <strong>Piano B</strong> (configurazione alternativa). Ricordati di salvare.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Istruzioni */}
      <Card className="order-6 bg-gray-50">
        <CardContent className="p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-gray-500" />
          <p className="text-sm text-gray-600">
            <strong>Su iPad:</strong> la planimetria si apre come una tavola da disegno. Pizzica con due dita per ingrandire, trascina con due dita per spostare la tavola e trascina direttamente tavoli e stazioni. Un doppio tocco centra di nuovo il lavoro.
          </p>
        </CardContent>
      </Card>

      <Card className="order-7" data-testid="copia-schema-card">
        <CardHeader>
          <CardTitle className="text-base">Scegli schema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-2 items-start md:items-center" data-testid="schema-preferiti-compact-row">
          <select
            className="w-full md:max-w-lg border rounded-lg px-3 py-2 text-sm"
            value={schemaDaCopiareId}
            onChange={(e) => setSchemaDaCopiareId(e.target.value)}
            data-testid="copia-schema-select"
          >
            <option value="">{eventiPreferiti.length ? '-- Seleziona evento di riferimento --' : 'Nessuno schema preferito'}</option>
            {eventiPreferiti.map((ev) => (
              <option key={ev.id} value={String(ev.id)}>
                #{ev.id} · {ev.titolo} · {ev.tipo} · {ev.personePreviste || 0} invitati
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            onClick={handleCopiaSchema}
            disabled={!schemaDaCopiareId}
            data-testid="copia-schema-btn"
          >
            Applica schema
          </Button>

          <Button
            variant="outline"
            onClick={() => schemaDaCopiareId && addPreferitoSchema(Number(schemaDaCopiareId))}
            disabled={!schemaDaCopiareId}
            data-testid="add-schema-preferito-star-btn"
            className="px-3"
          >
            <Star className={`w-4 h-4 ${preferitiSchemaIds.includes(Number(schemaDaCopiareId)) ? 'fill-current text-amber-500' : 'text-gray-500'}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => schemaDaCopiareId && togglePreferitoSchema(Number(schemaDaCopiareId))}
            disabled={!schemaDaCopiareId}
            data-testid="remove-schema-preferito-btn"
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Rimuovi Preferito
          </Button>
          </div>
        </CardContent>
      </Card>

      {/* Piantina */}
      <Card className="order-4 overflow-hidden">
        <CardContent className="p-4">
          <VillaPiantina
            key={pianoAttivo}
            disposizione={disposizioneCorrente}
            onChange={aggiornaDisposizione}
            editabile={true}
            stampaRef={stampaRef}
            onStampa={handleStampaPlanimetria}
            planimetrie={planimetrie}
            onNuovaPlanimetria={handleUploadPlanimetriaGlobale}
            onCambiaPlanimetria={(url) => {
              if (pianoAttivo === 'B') {
                setDisposizionePianoB((prev) => ({ ...prev, immagine: url }))
              } else {
                setDisposizione((prev) => ({ ...prev, immagine: url }))
              }
              setHasChanges(true)
            }}
            onDeletePlanimetria={handleDeletePlanimetriaGlobale}
            variantiAttive={variantiAttive}
            onBack={() => router.push(`/modifica-evento/${id}`)}
            onSave={handleSave}
            isSaving={isSaving}
            hasUnsavedChanges={hasChanges}
            workspaceTitle={evento.titolo}
            pianoLabel={`Piano ${pianoAttivo}`}
            onTogglePiano={() => {
              setPianoAttivo((current) => current === 'A' ? 'B' : 'A')
              setHasChanges(true)
            }}
            startInFocusMode
            syncStatusLabel={syncStatusLabel}
            syncStatusTone={visibleSyncState}
            onKeepLocalVersion={handleKeepLocalVersion}
            onUseServerVersion={handleUseServerVersion}
          />
        </CardContent>
      </Card>
    </div>
  )
}
