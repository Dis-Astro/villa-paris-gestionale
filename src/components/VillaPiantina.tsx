'use client'

import { useState, useRef, useEffect } from 'react'
import Tavolo from './Tavolo'
import Stazione from './Stazione'
import PannelloVariantiTavolo from './PannelloVariantiTavolo'
import { Tavolo as TavoloType, Stazione as StazioneType } from '../types/piantina'
import { type VariantId, type VariantiTavolo } from '@/lib/types'
import {
  Upload,
  Printer,
  Crop,
  Lock,
  Grid3X3,
  Trash2,
  Undo2,
  Redo2,
  Maximize2,
  Minimize2,
  Copy,
  RotateCcw,
  Move,
  Armchair,
  PanelTop,
  ArrowLeft,
  MoreHorizontal,
  Save,
  Cloud,
  CloudOff,
  HardDrive,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

type Disposizione = {
  tavoli: TavoloType[]
  stazioni: StazioneType[]
  immagine?: string
  rotazioneImmagine?: number
}

const cloneDisposizione = (value: Disposizione): Disposizione => JSON.parse(JSON.stringify(value))

export default function VillaPiantina({
  disposizione,
  onChange,
  editabile = true,
  planimetrie = [],
  onNuovaPlanimetria,
  onCambiaPlanimetria,
  onDeletePlanimetria,
  onStampa,
  stampaRef,
  variantiAttive = [],
  onBack,
  onSave,
  isSaving = false,
  hasUnsavedChanges = false,
  workspaceTitle = 'Disposizione sala',
  pianoLabel = 'Piano A',
  onTogglePiano,
  startInFocusMode = false,
  syncStatusLabel = 'Sincronizzato',
  syncStatusTone = 'synced',
  onKeepLocalVersion,
  onUseServerVersion,
}: {
  disposizione: Disposizione
  onChange?: (nuovaDisposizione: Disposizione) => void
  editabile?: boolean
  planimetrie?: { nome: string, url: string }[]
  onNuovaPlanimetria?: (file: File) => void | Promise<void>
  onCambiaPlanimetria?: (url: string) => void
  onDeletePlanimetria?: (url: string) => void | Promise<void>
  onStampa?: () => void
  stampaRef?: React.RefObject<HTMLDivElement>
  variantiAttive?: VariantId[]
  onBack?: () => void
  onSave?: () => void | Promise<void>
  isSaving?: boolean
  hasUnsavedChanges?: boolean
  workspaceTitle?: string
  pianoLabel?: string
  onTogglePiano?: () => void
  startInFocusMode?: boolean
  syncStatusLabel?: string
  syncStatusTone?: 'synced' | 'local' | 'pending' | 'syncing' | 'offline' | 'conflict' | 'blocked'
  onKeepLocalVersion?: () => void | Promise<void>
  onUseServerVersion?: () => void | Promise<void>
}) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(disposizione?.immagine || null)
  const [planimetriaSelezionata, setPlanimetriaSelezionata] = useState<string | null>(null)
  const [tavoloVariantiAperto, setTavoloVariantiAperto] = useState<TavoloType | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editorMode, setEditorMode] = useState<'upload' | 'edit'>('upload')
  const [editorSource, setEditorSource] = useState<string | null>(null)
  const [editorZoom, setEditorZoom] = useState(1)
  const [editorRotation, setEditorRotation] = useState(0)
  const [editorOffsetX, setEditorOffsetX] = useState(0)
  const [editorOffsetY, setEditorOffsetY] = useState(0)
  const [isApplyingEditor, setIsApplyingEditor] = useState(false)
  const [isDraggingEditorImage, setIsDraggingEditorImage] = useState(false)
  const [lockDrag, setLockDrag] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [viewZoom, setViewZoom] = useState(1)
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 })
  const [focusMode, setFocusMode] = useState(startInFocusMode)
  const [showToolsPanel, setShowToolsPanel] = useState(false)
  const [historyTick, setHistoryTick] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorPreviewRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)
  const undoStackRef = useRef<Disposizione[]>([])
  const redoStackRef = useRef<Disposizione[]>([])
  const gesturePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<{
    startDistance: number
    startZoom: number
    anchorX: number
    anchorY: number
  } | null>(null)

  useEffect(() => {
    setBackgroundImage(disposizione?.immagine || null)
    if (typeof disposizione?.immagine === 'string' && disposizione.immagine.startsWith('/planimetrie/')) {
      setPlanimetriaSelezionata(disposizione.immagine)
    }
  }, [disposizione?.immagine])

  const safeDisposizione = {
    tavoli: Array.isArray(disposizione?.tavoli) ? disposizione.tavoli : [],
    stazioni: Array.isArray(disposizione?.stazioni) ? disposizione.stazioni : [],
    immagine: disposizione?.immagine || undefined,
    rotazioneImmagine: disposizione?.rotazioneImmagine || 0
  }

  const emitChange = (next: Partial<Disposizione>) => {
    if (!onChange) return
    undoStackRef.current = [...undoStackRef.current.slice(-39), cloneDisposizione(safeDisposizione)]
    redoStackRef.current = []
    const result = {
      ...safeDisposizione,
      immagine: backgroundImage ?? undefined,
      rotazioneImmagine: 0,
      ...next
    }
    onChange(result)
    setHistoryTick((value) => value + 1)
  }

  const handleUndo = () => {
    if (!onChange) return
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current.push(cloneDisposizione(safeDisposizione))
    setBackgroundImage(previous.immagine || null)
    onChange(cloneDisposizione(previous))
    setSelectedItem(null)
    setHistoryTick((value) => value + 1)
  }

  const handleRedo = () => {
    if (!onChange) return
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(cloneDisposizione(safeDisposizione))
    setBackgroundImage(next.immagine || null)
    onChange(cloneDisposizione(next))
    setSelectedItem(null)
    setHistoryTick((value) => value + 1)
  }

  const clampTavolo = (value: number) => Math.max(0.02, Math.min(0.18, value))
  const clampStazioneW = (value: number) => Math.max(0.08, Math.min(0.45, value))
  const clampStazioneH = (value: number) => Math.max(0.04, Math.min(0.25, value))

  const selectedTavoloId = selectedItem?.startsWith('tavolo-') ? Number(selectedItem.split('-')[1]) : null
  const selectedStazioneId = selectedItem?.startsWith('stazione-') ? Number(selectedItem.split('-')[1]) : null
  const selectedTavolo = selectedTavoloId ? safeDisposizione.tavoli.find((t) => t.id === selectedTavoloId) : null
  const selectedStazione = selectedStazioneId ? safeDisposizione.stazioni.find((s) => s.id === selectedStazioneId) : null

  const handleDragEnd = (tipo: 'tavolo' | 'stazione', id: number, nuovaPosPerc: { x: number, y: number }) => {
    if (lockDrag) return
    const step = 0.02
    const normalized = snapToGrid
      ? {
          x: Math.round(nuovaPosPerc.x / step) * step,
          y: Math.round(nuovaPosPerc.y / step) * step
        }
      : nuovaPosPerc

    if (tipo === 'tavolo') {
      const nuoviTavoli = safeDisposizione.tavoli.map(t =>
        t.id === id ? { ...t, posizione: { xPerc: normalized.x, yPerc: normalized.y } } : t
      )
      emitChange({ tavoli: nuoviTavoli })
    } else {
      const nuoveStazioni = safeDisposizione.stazioni.map(s =>
        s.id === id ? { ...s, posizione: { xPerc: normalized.x, yPerc: normalized.y } } : s
      )
      emitChange({ stazioni: nuoveStazioni })
    }
  }

  const handleRotateTavolo = (id: number, nuovaRotazione: number) => {
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === id ? { ...t, rotazione: nuovaRotazione } : t
    )
    emitChange({ tavoli: nuoviTavoli })
  }

  const handleRotateStazione = (id: number, nuovaRotazione: number) => {
    const nuoveStazioni = safeDisposizione.stazioni.map(s =>
      s.id === id ? { ...s, rotazione: nuovaRotazione } : s
    )
    emitChange({ stazioni: nuoveStazioni })
  }

  const handleResizeTavolo = (id: number, nuovaDimensionePerc: number) => {
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === id ? { ...t, dimensionePerc: nuovaDimensionePerc } : t
    )
    emitChange({ tavoli: nuoviTavoli })
  }

  const handleUpdatePostiTavolo = (id: number, posti: number) => {
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === id ? { ...t, posti } : t
    )
    emitChange({ tavoli: nuoviTavoli })
  }

  const handleResizeStazione = (id: number, dimensionePerc: { larghezzaPerc: number, altezzaPerc: number }) => {
    const nuoveStazioni = safeDisposizione.stazioni.map(s =>
      s.id === id ? { ...s, dimensionePerc } : s
    )
    emitChange({ stazioni: nuoveStazioni })
  }

  const resizeSelectedTavolo = (delta: number) => {
    if (!selectedTavoloId) return
    const target = safeDisposizione.tavoli.find((t) => t.id === selectedTavoloId)
    if (!target) return
    handleResizeTavolo(selectedTavoloId, clampTavolo((target.dimensionePerc ?? 0.03) + delta))
  }

  const resizeSelectedStazione = (deltaW: number, deltaH: number) => {
    if (!selectedStazioneId) return
    const target = safeDisposizione.stazioni.find((s) => s.id === selectedStazioneId)
    if (!target) return
    handleResizeStazione(selectedStazioneId, {
      larghezzaPerc: clampStazioneW((target.dimensionePerc?.larghezzaPerc ?? 0.15) + deltaW),
      altezzaPerc: clampStazioneH((target.dimensionePerc?.altezzaPerc ?? 0.06) + deltaH)
    })
  }

  const resizeAllTavoli = (delta: number) => {
    emitChange({
      tavoli: safeDisposizione.tavoli.map((t) => ({
        ...t,
        dimensionePerc: clampTavolo((t.dimensionePerc ?? 0.03) + delta)
      }))
    })
  }

  const resizeAllStazioni = (deltaW: number, deltaH: number) => {
    emitChange({
      stazioni: safeDisposizione.stazioni.map((s) => ({
        ...s,
        dimensionePerc: {
          larghezzaPerc: clampStazioneW((s.dimensionePerc?.larghezzaPerc ?? 0.15) + deltaW),
          altezzaPerc: clampStazioneH((s.dimensionePerc?.altezzaPerc ?? 0.06) + deltaH)
        }
      }))
    })
  }

  const resetSizeAll = () => {
    emitChange({
      tavoli: safeDisposizione.tavoli.map((t) => ({ ...t, dimensionePerc: 0.03 })),
      stazioni: safeDisposizione.stazioni.map((s) => ({
        ...s,
        dimensionePerc: { larghezzaPerc: 0.15, altezzaPerc: 0.06 }
      }))
    })
  }

  const handleDeleteSelectedPlanimetria = async () => {
    if (!planimetriaSelezionata || !onDeletePlanimetria) return
    await Promise.resolve(onDeletePlanimetria(planimetriaSelezionata))
    if (backgroundImage === planimetriaSelezionata) {
      setBackgroundImage(null)
      emitChange({ immagine: undefined })
    }
    setPlanimetriaSelezionata(null)
  }

  const handleDeleteTavolo = (id: number) => {
    const nuoviTavoli = safeDisposizione.tavoli.filter(t => t.id !== id)
    emitChange({ tavoli: nuoviTavoli })
    setSelectedItem(null)
  }

  const handleDeleteStazione = (id: number) => {
    const nuoveStazioni = safeDisposizione.stazioni.filter(s => s.id !== id)
    emitChange({ stazioni: nuoveStazioni })
    setSelectedItem(null)
  }

  const handleRenameTavolo = (id: number, nuovoNome: string) => {
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === id ? { ...t, numero: nuovoNome } : t
    )
    emitChange({ tavoli: nuoviTavoli })
  }

  const handleRenameStazione = (id: number, nuovoNome: string) => {
    const nuoveStazioni = safeDisposizione.stazioni.map(s =>
      s.id === id ? { ...s, nome: nuovoNome } : s
    )
    emitChange({ stazioni: nuoveStazioni })
  }

  const moveSelected = (deltaX: number, deltaY: number) => {
    if (selectedTavoloId) {
      emitChange({
        tavoli: safeDisposizione.tavoli.map((t) => t.id === selectedTavoloId ? {
          ...t,
          posizione: {
            xPerc: Math.max(0, Math.min(0.96, (t.posizione?.xPerc ?? 0) + deltaX)),
            yPerc: Math.max(0, Math.min(0.96, (t.posizione?.yPerc ?? 0) + deltaY)),
          },
        } : t),
      })
    } else if (selectedStazioneId) {
      emitChange({
        stazioni: safeDisposizione.stazioni.map((s) => s.id === selectedStazioneId ? {
          ...s,
          posizione: {
            xPerc: Math.max(0, Math.min(0.9, (s.posizione?.xPerc ?? 0) + deltaX)),
            yPerc: Math.max(0, Math.min(0.9, (s.posizione?.yPerc ?? 0) + deltaY)),
          },
        } : s),
      })
    }
  }

  const duplicateSelected = () => {
    if (selectedTavolo) {
      const id = Math.max(0, ...safeDisposizione.tavoli.map((t) => t.id || 0)) + 1
      const duplicate = {
        ...cloneDisposizione({ tavoli: [selectedTavolo], stazioni: [] }).tavoli[0],
        id,
        numero: `${selectedTavolo.numero} bis`,
        posizione: {
          xPerc: Math.min(0.92, (selectedTavolo.posizione?.xPerc ?? 0) + 0.04),
          yPerc: Math.min(0.92, (selectedTavolo.posizione?.yPerc ?? 0) + 0.04),
        },
      }
      emitChange({ tavoli: [...safeDisposizione.tavoli, duplicate] })
      setSelectedItem(`tavolo-${id}`)
    } else if (selectedStazione) {
      const id = Math.max(0, ...safeDisposizione.stazioni.map((s) => s.id || 0)) + 1
      const duplicate = {
        ...cloneDisposizione({ tavoli: [], stazioni: [selectedStazione] }).stazioni[0],
        id,
        nome: `${selectedStazione.nome} bis`,
        posizione: {
          xPerc: Math.min(0.85, (selectedStazione.posizione?.xPerc ?? 0) + 0.04),
          yPerc: Math.min(0.88, (selectedStazione.posizione?.yPerc ?? 0) + 0.04),
        },
      }
      emitChange({ stazioni: [...safeDisposizione.stazioni, duplicate] })
      setSelectedItem(`stazione-${id}`)
    }
  }

  // Handler per salvare varianti tavolo
  const handleSaveVariantiTavolo = (tavoloId: number, varianti: VariantiTavolo) => {
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === tavoloId ? { ...t, varianti } : t
    )
    emitChange({ tavoli: nuoviTavoli })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const imgSrc = event.target?.result as string
      setEditorMode('upload')
      setEditorSource(imgSrc)
      setEditorZoom(1)
      setEditorRotation(0)
      setEditorOffsetX(0)
      setEditorOffsetY(0)
      setShowEditor(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const apriEditorSuImmagine = (src: string) => {
    setEditorMode('edit')
    setEditorSource(src)
    setEditorZoom(1)
    setEditorRotation(0)
    setEditorOffsetX(0)
    setEditorOffsetY(0)
    setShowEditor(true)
  }

  const handleStartEditorDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!editorPreviewRef.current) return
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: editorOffsetX,
      startOffsetY: editorOffsetY
    }
    setIsDraggingEditorImage(true)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId)
  }

  useEffect(() => {
    if (!isDraggingEditorImage) return

    const onMove = (ev: PointerEvent) => {
      if (!dragStateRef.current || !editorPreviewRef.current) return
      const rect = editorPreviewRef.current.getBoundingClientRect()
      const deltaXPerc = ((ev.clientX - dragStateRef.current.startX) / rect.width) * 100
      const deltaYPerc = ((ev.clientY - dragStateRef.current.startY) / rect.height) * 100
      setEditorOffsetX(Math.max(-120, Math.min(120, dragStateRef.current.startOffsetX + deltaXPerc)))
      setEditorOffsetY(Math.max(-120, Math.min(120, dragStateRef.current.startOffsetY + deltaYPerc)))
    }

    const onUp = () => {
      setIsDraggingEditorImage(false)
      dragStateRef.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [isDraggingEditorImage])

  const renderEditedImage = async () => {
    if (!editorSource) return null

    return new Promise<string>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 1920
        canvas.height = 1080
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas non disponibile'))
          return
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height)
        const finalScale = baseScale * editorZoom
        const offsetXPx = (editorOffsetX / 100) * canvas.width
        const offsetYPx = (editorOffsetY / 100) * canvas.height

        ctx.save()
        ctx.translate(canvas.width / 2 + offsetXPx, canvas.height / 2 + offsetYPx)
        ctx.rotate((editorRotation * Math.PI) / 180)
        ctx.scale(finalScale, finalScale)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()

        resolve(canvas.toDataURL('image/jpeg', 0.92))
      }
      img.onerror = () => reject(new Error('Immagine non valida'))
      img.src = editorSource
    })
  }

  const dataUrlToFile = (dataUrl: string, filename: string) => {
    const [meta, body] = dataUrl.split(',')
    const mimeMatch = meta.match(/:(.*?);/)
    const mime = mimeMatch?.[1] || 'image/jpeg'
    const binary = atob(body)
    const arr = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
    return new File([arr], filename, { type: mime })
  }

  const handleApplyEditor = async () => {
    if (!editorSource) return
    setIsApplyingEditor(true)
    try {
      const finalImage = await renderEditedImage()
      if (!finalImage) return

      setBackgroundImage(finalImage)
      emitChange({ immagine: finalImage, rotazioneImmagine: 0 })

      if (onNuovaPlanimetria) {
        const file = dataUrlToFile(finalImage, `planimetria-${Date.now()}.jpg`)
        await Promise.resolve(onNuovaPlanimetria(file))
      }

      setShowEditor(false)
    } finally {
      setIsApplyingEditor(false)
    }
  }

  const handleChangePlanimetria = (url: string) => {
    setPlanimetriaSelezionata(url)
    setBackgroundImage(url)
    if (onCambiaPlanimetria) {
      onCambiaPlanimetria(url)
    }
    emitChange({ immagine: url })
  }

  const aggiungiTavolo = () => {
    const nuovoId = Math.max(0, ...safeDisposizione.tavoli.map(t => t.id || 0)) + 1
    emitChange({
      tavoli: [
        ...safeDisposizione.tavoli,
        {
          id: nuovoId,
          numero: `T${nuovoId}`,
          posti: 8,
          posizione: { xPerc: 0.12, yPerc: 0.12 },
          rotazione: 0,
          forma: 'rotondo',
          dimensionePerc: 0.03
        }
      ]
    })
  }

  const aggiungiTavoloImperiale = () => {
    const nuovoId = Math.max(0, ...safeDisposizione.tavoli.map(t => t.id || 0)) + 1
    emitChange({
      tavoli: [
        ...safeDisposizione.tavoli,
        {
          id: nuovoId,
          numero: `Imperiale ${nuovoId}`,
          posti: 20,
          posizione: { xPerc: 0.15, yPerc: 0.15 },
          rotazione: 0,
          forma: 'imperiale',
          dimensionePerc: 0.04
        }
      ]
    })
  }

  const aggiungiStazione = () => {
    const nuovoId = Math.max(0, ...safeDisposizione.stazioni.map(s => s.id || 0)) + 1
    emitChange({
      stazioni: [
        ...safeDisposizione.stazioni,
        {
          id: nuovoId,
          nome: `Stazione ${nuovoId}`,
          tipo: 'buffet',
          posizione: { xPerc: 0.18, yPerc: 0.18 },
          rotazione: 0,
          dimensionePerc: { larghezzaPerc: 0.15, altezzaPerc: 0.06 }
        }
      ]
    })
  }

  const clampViewZoom = (value: number) => Math.max(0.7, Math.min(3.25, value))

  const limitViewPan = (pan: { x: number; y: number }, zoom: number) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return pan
    const limitX = rect.width * Math.max(0.65, zoom * 0.75)
    const limitY = rect.height * Math.max(0.65, zoom * 0.75)
    return {
      x: Math.max(-limitX, Math.min(limitX, pan.x)),
      y: Math.max(-limitY, Math.min(limitY, pan.y)),
    }
  }

  const resetView = () => {
    setViewZoom(1)
    setViewPan({ x: 0, y: 0 })
  }

  const beginGesture = () => {
    const viewport = viewportRef.current
    const points = Array.from(gesturePointersRef.current.values())
    if (!viewport || points.length < 2) return
    const [first, second] = points
    const rect = viewport.getBoundingClientRect()
    const center = {
      x: (first.x + second.x) / 2 - rect.left - rect.width / 2,
      y: (first.y + second.y) / 2 - rect.top - rect.height / 2,
    }
    gestureRef.current = {
      startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      startZoom: viewZoom,
      anchorX: (center.x - viewPan.x) / viewZoom,
      anchorY: (center.y - viewPan.y) / viewZoom,
    }
  }

  const handleViewportPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return
    gesturePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    event.currentTarget.setPointerCapture?.(event.pointerId)
    if (gesturePointersRef.current.size === 2) beginGesture()
  }

  const handleViewportPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!gesturePointersRef.current.has(event.pointerId)) return
    gesturePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const gesture = gestureRef.current
    const viewport = viewportRef.current
    const points = Array.from(gesturePointersRef.current.values())
    if (!gesture || !viewport || points.length < 2) return
    event.preventDefault()
    const [first, second] = points
    const rect = viewport.getBoundingClientRect()
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
    const nextZoom = clampViewZoom(gesture.startZoom * (distance / gesture.startDistance))
    const center = {
      x: (first.x + second.x) / 2 - rect.left - rect.width / 2,
      y: (first.y + second.y) / 2 - rect.top - rect.height / 2,
    }
    const nextPan = limitViewPan({
      x: center.x - gesture.anchorX * nextZoom,
      y: center.y - gesture.anchorY * nextZoom,
    }, nextZoom)
    setViewZoom(nextZoom)
    setViewPan(nextPan)
  }

  const handleViewportPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    gesturePointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
    if (gesturePointersRef.current.size < 2) gestureRef.current = null
    else beginGesture()
  }

  const handleViewportWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const viewport = viewportRef.current
    if (!viewport) return
    if (event.ctrlKey || event.metaKey) {
      const rect = viewport.getBoundingClientRect()
      const nextZoom = clampViewZoom(viewZoom * Math.exp(-event.deltaY * 0.004))
      const pointer = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      }
      const anchor = {
        x: (pointer.x - viewPan.x) / viewZoom,
        y: (pointer.y - viewPan.y) / viewZoom,
      }
      setViewZoom(nextZoom)
      setViewPan(limitViewPan({
        x: pointer.x - anchor.x * nextZoom,
        y: pointer.y - anchor.y * nextZoom,
      }, nextZoom))
      return
    }
    setViewPan((current) => limitViewPan({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }, viewZoom))
  }

  useEffect(() => {
    if (!focusMode) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [focusMode])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) handleRedo()
        else handleUndo()
        return
      }
      if (event.key === 'Escape') {
        if (selectedItem) setSelectedItem(null)
        else if (focusMode) setFocusMode(false)
        return
      }
      if (!selectedItem) return
      const step = event.shiftKey ? 0.02 : 0.005
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelected(-step, 0) }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveSelected(step, 0) }
      if (event.key === 'ArrowUp') { event.preventDefault(); moveSelected(0, -step) }
      if (event.key === 'ArrowDown') { event.preventDefault(); moveSelected(0, step) }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        if (selectedTavoloId) handleDeleteTavolo(selectedTavoloId)
        if (selectedStazioneId) handleDeleteStazione(selectedStazioneId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  // --- UI ---

  const syncStatusClass = syncStatusTone === 'conflict' || syncStatusTone === 'blocked'
    ? 'bg-[#fff0e8] text-[#a2472d]'
    : syncStatusTone === 'pending' || syncStatusTone === 'offline'
      ? 'bg-[#f8f1e1] text-[#765c26]'
      : syncStatusTone === 'local'
        ? 'bg-[#edf3ef] text-[#31594f]'
        : 'bg-[#e6f0eb] text-[#31594f]'

  const syncStatusIcon = syncStatusTone === 'conflict' || syncStatusTone === 'blocked'
    ? <ShieldAlert className="h-3.5 w-3.5" />
    : syncStatusTone === 'offline'
      ? <CloudOff className="h-3.5 w-3.5" />
      : syncStatusTone === 'local'
        ? <HardDrive className="h-3.5 w-3.5" />
        : syncStatusTone === 'pending' || syncStatusTone === 'syncing'
          ? <RefreshCw className={`h-3.5 w-3.5 ${syncStatusTone === 'syncing' ? 'animate-spin' : ''}`} />
          : <Cloud className="h-3.5 w-3.5" />

  return (
    <div
      className={focusMode
        ? 'fixed inset-0 z-[70] h-[100dvh] w-screen overflow-hidden bg-[#dce2de]'
        : 'mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-3 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-4'}
    >
      <div
        className={focusMode
          ? 'absolute left-3 right-3 top-3 z-30 flex items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/88 p-2 shadow-[0_12px_34px_rgba(20,49,45,.16)] backdrop-blur-xl'
          : 'order-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#173c37]/10 bg-white/92 p-2 shadow-sm backdrop-blur lg:col-span-2'}
        data-history-version={historyTick}
        data-testid="piantina-immersive-toolbar"
      >
        <div className="flex min-w-0 items-center gap-1">
          {focusMode && (
            <>
              <button
                type="button"
                onClick={() => onBack ? onBack() : setFocusMode(false)}
                className="touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#173c37] hover:bg-[#edf3ef]"
                aria-label="Torna all'evento"
                data-testid="piantina-immersive-back-btn"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Evento</span>
              </button>
              <span className="mx-1 h-7 w-px bg-[#173c37]/10" />
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-semibold text-[#173c37]">{workspaceTitle}</p>
                <p className="text-[11px] text-[#718d7e]">Pizzica e sposta con due dita</p>
              </div>
              <span className="mx-1 hidden h-7 w-px bg-[#173c37]/10 lg:block" />
            </>
          )}
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStackRef.current.length === 0}
            className="touch-target rounded-xl p-2.5 text-[#31594f] hover:bg-[#edf3ef] disabled:opacity-30"
            aria-label="Annulla"
            title="Annulla (⌘Z)"
            data-testid="piantina-undo-btn"
          ><Undo2 className="h-5 w-5" /></button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStackRef.current.length === 0}
            className="touch-target rounded-xl p-2.5 text-[#31594f] hover:bg-[#edf3ef] disabled:opacity-30"
            aria-label="Ripeti"
            title="Ripeti (⇧⌘Z)"
            data-testid="piantina-redo-btn"
          ><Redo2 className="h-5 w-5" /></button>
          <span className="mx-1 h-7 w-px bg-[#173c37]/10" />
          <button
            type="button"
            onClick={() => setLockDrag((value) => !value)}
            className={`touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${lockDrag ? 'bg-[#f3e7cb] text-[#765c26]' : 'bg-[#e6f0eb] text-[#31594f]'}`}
            data-testid="piantina-toggle-lock-drag-btn"
          >{lockDrag ? <Lock className="h-4 w-4" /> : <Move className="h-4 w-4" />}<span className="hidden sm:inline">{lockDrag ? 'Bloccata' : 'Sposta liberamente'}</span></button>
          <button
            type="button"
            onClick={() => setSnapToGrid((value) => !value)}
            className={`touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${snapToGrid ? 'bg-[#173c37] text-white' : 'text-[#526a65] hover:bg-[#edf3ef]'}`}
            data-testid="piantina-toggle-snap-grid-btn"
          ><Grid3X3 className="h-4 w-4" /><span className="hidden sm:inline">Griglia</span></button>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[#f4f2ed] p-1">
          {focusMode && (
            <span
              className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold md:inline-flex ${syncStatusClass}`}
              data-testid="piantina-sync-status"
            >
              {syncStatusIcon}
              {syncStatusLabel}
            </span>
          )}
          {focusMode && onTogglePiano && (
            <button
              type="button"
              onClick={onTogglePiano}
              className="touch-target rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#765c26] shadow-sm"
              data-testid="piantina-immersive-piano-btn"
            >
              {pianoLabel}
            </button>
          )}
          {focusMode && onSave && (
            <button
              type="button"
              onClick={() => onSave()}
              disabled={isSaving}
              className={`touch-target inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60 ${hasUnsavedChanges ? 'bg-[#a67832]' : 'bg-[#173c37]'}`}
              data-testid="piantina-immersive-save-btn"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">{isSaving ? 'Salvo…' : 'Salva'}</span>
            </button>
          )}
          {focusMode && (
            <button
              type="button"
              onClick={() => setShowToolsPanel((value) => !value)}
              className={`touch-target rounded-lg p-2 ${showToolsPanel ? 'bg-[#173c37] text-white' : 'bg-white text-[#31594f]'}`}
              aria-label="Altri strumenti"
              data-testid="piantina-immersive-tools-btn"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
          <button type="button" onClick={() => { setFocusMode((value) => !value); setShowToolsPanel(false) }} className="touch-target rounded-lg bg-white p-2 text-[#31594f] shadow-sm" aria-label={focusMode ? 'Esci dalla tavola' : 'Apri tavola a tutto schermo'} data-testid="piantina-focus-mode-btn">
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {focusMode && syncStatusTone === 'conflict' && (
        <div className="absolute left-1/2 top-20 z-40 flex w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col gap-3 rounded-2xl border border-[#d89b78]/45 bg-white/96 p-4 shadow-[0_18px_48px_rgba(79,37,24,.22)] backdrop-blur-xl sm:flex-row sm:items-center" data-testid="piantina-conflict-banner">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#8f3d28]"><ShieldAlert className="h-4 w-4" /> Modifica contemporanea rilevata</p>
            <p className="mt-1 text-xs leading-relaxed text-[#76594f]">La tua bozza è al sicuro. Scegli se mantenere il lavoro di questo iPad o caricare la versione già salvata sul server.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => onUseServerVersion?.()} className="touch-target rounded-xl border border-[#173c37]/15 bg-white px-3 py-2 text-xs font-semibold text-[#31594f]">Usa server</button>
            <button type="button" onClick={() => onKeepLocalVersion?.()} className="touch-target rounded-xl bg-[#a67832] px-3 py-2 text-xs font-semibold text-white">Mantieni iPad</button>
          </div>
        </div>
      )}

      {/* SIDEBAR PULSANTI SINISTRA */}
      <div className={focusMode
        ? `${showToolsPanel || selectedItem ? 'flex' : 'hidden'} absolute bottom-24 right-3 top-20 z-20 w-[min(21rem,calc(100vw-1.5rem))] flex-col items-start gap-3 overflow-y-auto rounded-2xl border border-white/70 bg-white/94 p-3 shadow-[0_18px_48px_rgba(20,49,45,.2)] backdrop-blur-xl`
        : 'order-3 flex flex-col items-start gap-3 lg:order-2'}>
        {editabile && (
          <>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#173c37]/10 bg-white px-4 py-2.5 text-sm font-medium text-[#31594f] shadow-sm hover:bg-[#edf3ef]"
              onClick={() => onStampa && onStampa()}
              data-testid="piantina-stampa-btn"
            >
              <Printer size={16} />
              <span>Stampa</span>
            </button>
            {planimetrie && planimetrie.length > 0 && (
              <div className="w-full space-y-2 rounded-2xl border border-[#173c37]/10 bg-white p-3 shadow-sm" data-testid="piantina-library-wrap">
                <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#718d7e]">Sfondo sala</p>
                <select
                  className="h-11 w-full rounded-xl border border-[#173c37]/12 bg-white px-3 text-sm"
                  value={planimetriaSelezionata ?? ''}
                  onChange={e => handleChangePlanimetria(e.target.value)}
                  data-testid="piantina-select-plani"
                >
                  <option value="">-- Planimetria --</option>
                  {planimetrie.map(p => (
                    <option key={p.url} value={p.url}>{p.nome.length > 32 ? `${p.nome.slice(0, 32)}…` : p.nome}</option>
                  ))}
                </select>
                <button
                  className="w-full rounded-xl bg-red-50 px-2 py-2 text-xs font-medium text-red-700 disabled:opacity-40"
                  onClick={handleDeleteSelectedPlanimetria}
                  disabled={!planimetriaSelezionata}
                  data-testid="piantina-delete-selected-btn"
                >
                  <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Elimina planimetria</span>
                </button>
              </div>
            )}
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173c37] px-3 py-2.5 text-sm font-semibold text-white shadow-sm"
              onClick={() => fileInputRef.current?.click()}
              data-testid="piantina-upload-bg-btn"
            >
              <Upload size={16} />
              <span>Cambia planimetria</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
            {backgroundImage && (
              <button
                className="w-full rounded-xl border border-[#c9a96a]/40 bg-[#f8f1e1] px-3 py-2.5 text-sm font-medium text-[#765c26]"
                onClick={() => apriEditorSuImmagine(backgroundImage)}
                data-testid="piantina-apri-editor-btn"
              >
                Modifica in griglia
              </button>
            )}
            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-[#173c37]/10 bg-white p-3 shadow-sm" data-testid="piantina-add-elements-row">
              <button
                className="rounded-xl border border-[#173c37]/12 bg-[#edf3ef] px-2 py-2.5 text-sm font-medium text-[#31594f]"
                onClick={aggiungiTavolo}
                data-testid="piantina-aggiungi-tavolo-btn"
              >
                + Tavolo
              </button>
              <button
                className="rounded-xl border border-[#c9a96a]/35 bg-[#f8f1e1] px-2 py-2.5 text-sm font-medium text-[#765c26]"
                onClick={aggiungiTavoloImperiale}
                data-testid="piantina-aggiungi-imperiale-btn"
              >
                + Imperiale
              </button>
              <button
                className="col-span-2 rounded-xl border border-[#718d7e]/25 bg-white px-2 py-2.5 text-sm font-medium text-[#31594f]"
                onClick={aggiungiStazione}
                data-testid="piantina-aggiungi-stazione-btn"
              >
                + Stazione
              </button>
            </div>

            <div className="w-full space-y-2 rounded-2xl border border-[#173c37]/10 bg-white p-3 shadow-sm" data-testid="piantina-control-panel">
              <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#718d7e]">Dimensioni</p>
              <div className="grid grid-cols-2 gap-1" data-testid="piantina-segmented-resize-massive">
                <button className="px-2 py-1.5 rounded-lg text-xs border bg-white" onClick={() => resizeAllTavoli(-0.005)} data-testid="resize-all-tavoli-minus-btn">Tavoli −</button>
                <button className="px-2 py-1.5 rounded-lg text-xs border bg-white" onClick={() => resizeAllTavoli(0.005)} data-testid="resize-all-tavoli-plus-btn">Tavoli +</button>
                <button className="px-2 py-1.5 rounded-lg text-xs border bg-white" onClick={() => resizeAllStazioni(-0.01, -0.005)} data-testid="resize-all-stazioni-minus-btn">Stazioni −</button>
                <button className="px-2 py-1.5 rounded-lg text-xs border bg-white" onClick={() => resizeAllStazioni(0.01, 0.005)} data-testid="resize-all-stazioni-plus-btn">Stazioni +</button>
              </div>

              <div className="grid grid-cols-2 gap-1" data-testid="piantina-segmented-resize-selected">
                <button
                  className="px-2 py-1.5 rounded-lg text-xs border bg-white disabled:opacity-40"
                  onClick={() => selectedTavoloId && resizeSelectedTavolo(-0.005)}
                  disabled={!selectedTavoloId}
                  data-testid="resize-selected-tavolo-minus-btn"
                >
                  Tavolo Sel −
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs border bg-white disabled:opacity-40"
                  onClick={() => selectedTavoloId && resizeSelectedTavolo(0.005)}
                  disabled={!selectedTavoloId}
                  data-testid="resize-selected-tavolo-plus-btn"
                >
                  Tavolo Sel +
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs border bg-white disabled:opacity-40"
                  onClick={() => selectedStazioneId && resizeSelectedStazione(-0.01, -0.005)}
                  disabled={!selectedStazioneId}
                  data-testid="resize-selected-stazione-minus-btn"
                >
                  Staz Sel −
                </button>
                <button
                  className="px-2 py-1.5 rounded-lg text-xs border bg-white disabled:opacity-40"
                  onClick={() => selectedStazioneId && resizeSelectedStazione(0.01, 0.005)}
                  disabled={!selectedStazioneId}
                  data-testid="resize-selected-stazione-plus-btn"
                >
                  Staz Sel +
                </button>
              </div>

              <button
                className="w-full px-2 py-1.5 rounded-lg text-xs border bg-white"
                onClick={resetSizeAll}
                data-testid="reset-size-all-btn"
              >
                Reset dimensioni
              </button>
            </div>

            {(selectedTavolo || selectedStazione) && (
              <div className={`${focusMode ? 'order-first' : ''} w-full space-y-3 rounded-2xl border border-[#173c37]/10 bg-white p-3 shadow-sm`} data-testid="piantina-selection-inspector">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#173c37]">
                    {selectedTavolo ? <Armchair className="h-4 w-4 text-[#a67832]" /> : <PanelTop className="h-4 w-4 text-[#4f7e70]" />}
                    {selectedTavolo ? 'Tavolo selezionato' : 'Stazione selezionata'}
                  </div>
                  <button type="button" onClick={() => setSelectedItem(null)} className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-50">Chiudi</button>
                </div>

                {selectedTavolo && (
                  <div className="grid grid-cols-[1fr_76px] gap-2">
                    <label className="space-y-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Nome
                      <input
                        type="text"
                        value={selectedTavolo.numero}
                        onChange={(event) => handleRenameTavolo(selectedTavolo.id, event.target.value)}
                        className="h-11 w-full rounded-xl border border-[#173c37]/12 px-3 text-sm font-medium normal-case tracking-normal text-gray-800"
                        data-testid={`rename-tavolo-${selectedTavolo.id}`}
                      />
                    </label>
                    <label className="space-y-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Posti
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={selectedTavolo.posti || 1}
                        onChange={(event) => handleUpdatePostiTavolo(selectedTavolo.id, Math.max(1, Number(event.target.value) || 1))}
                        className="h-11 w-full rounded-xl border border-[#173c37]/12 px-2 text-center text-sm font-semibold normal-case tracking-normal text-gray-800"
                        data-testid={`posti-tavolo-${selectedTavolo.id}`}
                      />
                    </label>
                  </div>
                )}

                {selectedStazione && (
                  <label className="space-y-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Nome
                    <input
                      type="text"
                      value={selectedStazione.nome}
                      onChange={(event) => handleRenameStazione(selectedStazione.id, event.target.value)}
                      className="h-11 w-full rounded-xl border border-[#173c37]/12 px-3 text-sm font-medium normal-case tracking-normal text-gray-800"
                      data-testid={`rename-stazione-${selectedStazione.id}`}
                    />
                  </label>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={() => moveSelected(0, -0.01)} className="col-start-2 rounded-xl border py-2 text-sm hover:bg-gray-50" aria-label="Sposta su">↑</button>
                  <button type="button" onClick={() => moveSelected(-0.01, 0)} className="rounded-xl border py-2 text-sm hover:bg-gray-50" aria-label="Sposta a sinistra">←</button>
                  <button type="button" onClick={() => moveSelected(0, 0.01)} className="rounded-xl border py-2 text-sm hover:bg-gray-50" aria-label="Sposta giù">↓</button>
                  <button type="button" onClick={() => moveSelected(0.01, 0)} className="rounded-xl border py-2 text-sm hover:bg-gray-50" aria-label="Sposta a destra">→</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => selectedTavolo ? handleRotateTavolo(selectedTavolo.id, ((selectedTavolo.rotazione || 0) + 45) % 360) : selectedStazione && handleRotateStazione(selectedStazione.id, ((selectedStazione.rotazione || 0) + 45) % 360)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium text-[#31594f] hover:bg-[#edf3ef]"
                    data-testid={selectedTavolo ? `rotate-tavolo-${selectedTavolo.id}` : `rotate-stazione-${selectedStazione?.id}`}
                  ><RotateCcw className="h-3.5 w-3.5" /> Ruota</button>
                  <button type="button" onClick={duplicateSelected} className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-medium text-[#31594f] hover:bg-[#edf3ef]"><Copy className="h-3.5 w-3.5" /> Duplica</button>
                  {selectedTavolo && (
                    <button type="button" onClick={() => setTavoloVariantiAperto(selectedTavolo)} className="col-span-2 rounded-xl bg-[#173c37] px-3 py-2.5 text-xs font-semibold text-white" data-testid={`varianti-btn-${selectedTavolo.id}`}>Gestisci varianti menu</button>
                  )}
                  <button
                    type="button"
                    onClick={() => selectedTavolo ? handleDeleteTavolo(selectedTavolo.id) : selectedStazione && handleDeleteStazione(selectedStazione.id)}
                    className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    data-testid={selectedTavolo ? `delete-tavolo-${selectedTavolo.id}` : `delete-stazione-${selectedStazione?.id}`}
                  ><Trash2 className="h-3.5 w-3.5" /> Elimina selezione</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* PLANIMETRIA */}
      <div className={focusMode ? 'absolute inset-0 z-0' : 'order-2 min-w-0 lg:order-3'}>
        <div
          ref={viewportRef}
          className={focusMode
            ? 'relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_center,#eef2ef_0%,#d9e0dc_72%,#cbd5d0_100%)]'
            : 'relative h-[min(68vh,720px)] min-h-[420px] overflow-hidden rounded-2xl border border-[#173c37]/10 bg-[radial-gradient(circle_at_center,#eef2ef_0%,#d9e0dc_100%)] shadow-inner'}
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerEnd}
          onPointerCancel={handleViewportPointerEnd}
          onWheel={handleViewportWheel}
          onDoubleClick={(event) => {
            if (!(event.target as HTMLElement).closest('[role="button"]')) resetView()
          }}
          data-testid="piantina-gesture-viewport"
          aria-label="Tavola planimetria. Usa due dita per ingrandire e spostare. Doppio tocco per centrare."
        >
          <div
            className="absolute left-1/2 top-1/2 aspect-[16/9]"
            data-testid="piantina-canvas-transform"
            style={{
              width: focusMode ? 'min(94vw, calc((100dvh - 150px) * 16 / 9))' : 'min(96%, 1120px)',
              transform: `translate(-50%, -50%) translate3d(${viewPan.x}px, ${viewPan.y}px, 0)`,
            }}
          >
            <div
              ref={stampaRef || containerRef}
              className="relative h-full w-full overflow-hidden rounded-xl border border-[#173c37]/15 bg-white shadow-[0_22px_46px_rgba(18,51,46,.18)]"
              style={{
                transform: `scale(${viewZoom})`,
                transformOrigin: 'center center',
                willChange: 'transform',
              }}
              data-testid="piantina-canvas-area"
              onClick={() => setSelectedItem(null)}
            >
          {/* Background */}
          <div
            className="absolute inset-0 w-full h-full bg-gray-100"
            style={backgroundImage ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            } : {}}
          >
            {!backgroundImage && (
              <div className="text-center pt-24">
                <p className="text-gray-500 mb-2">Immagine piantina Villa Paris</p>
              </div>
            )}
          </div>

          {snapToGrid && (
            <div
              className="pointer-events-none absolute inset-0 opacity-45"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(23,60,55,.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,60,55,.16) 1px, transparent 1px)',
                backgroundSize: '2% 2%',
              }}
              aria-hidden="true"
            />
          )}

          {/* Tavoli */}
          {safeDisposizione.tavoli.map(tavolo => (
            <Tavolo
              key={tavolo.id}
              tavolo={tavolo}
              selected={selectedItem === `tavolo-${tavolo.id}`}
              onSelect={() => setSelectedItem(`tavolo-${tavolo.id}`)}
              onDragEnd={pos => handleDragEnd('tavolo', tavolo.id, pos)}
              onRotate={rot => handleRotateTavolo(tavolo.id, rot)}
              onDelete={() => handleDeleteTavolo(tavolo.id)}
              onRename={nome => handleRenameTavolo(tavolo.id, nome)}
              onUpdatePosti={(posti) => handleUpdatePostiTavolo(tavolo.id, posti)}
              onOpenVarianti={() => setTavoloVariantiAperto(tavolo)}
              editabile={editabile}
              dragEnabled={!lockDrag}
              viewScale={viewZoom}
              containerRef={stampaRef || containerRef}
            />
          ))}

          {/* Stazioni */}
          {safeDisposizione.stazioni.map(stazione => (
            <Stazione
              key={stazione.id}
              stazione={stazione}
              selected={selectedItem === `stazione-${stazione.id}`}
              onSelect={() => setSelectedItem(`stazione-${stazione.id}`)}
              onDragEnd={pos => handleDragEnd('stazione', stazione.id, pos)}
              onRotate={rot => handleRotateStazione(stazione.id, rot)}
              onDelete={() => handleDeleteStazione(stazione.id)}
              onRename={nome => handleRenameStazione(stazione.id, nome)}
              editabile={editabile}
              dragEnabled={!lockDrag}
              viewScale={viewZoom}
              containerRef={stampaRef || containerRef}
            />
          ))}
            </div>
          </div>

          {focusMode && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-[#173c37]/78 px-3 py-1.5 text-[11px] font-medium text-white/90 shadow-sm backdrop-blur">
              {Math.round(viewZoom * 100)}% · due dita per muovere e zoomare · doppio tocco per centrare
            </div>
          )}
        </div>
      </div>

      {focusMode && editabile && (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-white/75 bg-white/90 p-1.5 shadow-[0_14px_38px_rgba(20,49,45,.2)] backdrop-blur-xl" data-testid="piantina-immersive-add-dock">
          <button type="button" onClick={aggiungiTavolo} className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#edf3ef] px-3 py-2 text-sm font-semibold text-[#31594f]" data-testid="piantina-immersive-add-table-btn">
            <Armchair className="h-4 w-4" /> <span className="hidden sm:inline">Tavolo</span>
          </button>
          <button type="button" onClick={aggiungiTavoloImperiale} className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#f8f1e1] px-3 py-2 text-sm font-semibold text-[#765c26]" data-testid="piantina-immersive-add-imperial-btn">
            <Armchair className="h-4 w-4" /> <span className="hidden sm:inline">Imperiale</span>
          </button>
          <button type="button" onClick={aggiungiStazione} className="touch-target inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#31594f] hover:bg-[#edf3ef]" data-testid="piantina-immersive-add-station-btn">
            <PanelTop className="h-4 w-4" /> <span className="hidden sm:inline">Stazione</span>
          </button>
        </div>
      )}

      {showEditor && editorSource && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="planimetria-editor-overlay">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden" data-testid="planimetria-editor-modal">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Crop className="w-4 h-4" />
                Ritaglia e Ruota Planimetria
              </h3>
              <div className="flex items-center gap-2">
                {editorMode === 'upload' && (
                  <button
                    type="button"
                    onClick={() => setEditorRotation((prev) => (prev + 90) % 360)}
                    className="px-2 py-1 rounded border text-sm text-gray-700"
                    data-testid="planimetria-editor-rotate-90-btn"
                  >
                    Ruota 90°
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                  data-testid="planimetria-editor-close-btn"
                >
                  Chiudi
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600" data-testid="planimetria-editor-helper-text">
                Trascina direttamente l'immagine nella griglia per decidere il taglio finale. Quello che vedi qui è quello che userai nella piantina.
              </p>

              <div
                ref={editorPreviewRef}
                className="aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden border-2 border-amber-400 relative select-none"
                data-testid="planimetria-editor-preview"
                onPointerDown={handleStartEditorDrag}
                style={{ cursor: isDraggingEditorImage ? 'grabbing' : 'grab' }}
              >
                <img
                  src={editorSource}
                  alt="Anteprima planimetria"
                  className="absolute left-1/2 top-1/2 w-full h-full object-cover"
                  style={{
                    transform: `translate(-50%, -50%) translate(${editorOffsetX}%, ${editorOffsetY}%) rotate(${editorRotation}deg) scale(${editorZoom})`,
                    transformOrigin: 'center center'
                  }}
                />

                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                  }}
                  data-testid="planimetria-editor-grid"
                />
                <div className="absolute inset-0 pointer-events-none border-4 border-white/80" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <label className="space-y-1">
                  <span className="text-gray-600">Zoom</span>
                  <input
                    type="range"
                    min={0.8}
                    max={3}
                    step={0.05}
                    value={editorZoom}
                    onChange={(e) => setEditorZoom(Number(e.target.value))}
                    className="w-full"
                    data-testid="planimetria-editor-zoom-slider"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-gray-600">Sposta orizzontale</span>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={1}
                    value={editorOffsetX}
                    onChange={(e) => setEditorOffsetX(Number(e.target.value))}
                    className="w-full"
                    data-testid="planimetria-editor-offsetx-slider"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-gray-600">Sposta verticale</span>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={1}
                    value={editorOffsetY}
                    onChange={(e) => setEditorOffsetY(Number(e.target.value))}
                    className="w-full"
                    data-testid="planimetria-editor-offsety-slider"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-3 py-2 rounded border text-sm"
                  data-testid="planimetria-editor-cancel-btn"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleApplyEditor}
                  disabled={isApplyingEditor}
                  className="px-3 py-2 rounded bg-amber-500 text-white text-sm disabled:opacity-60"
                  data-testid="planimetria-editor-apply-btn"
                >
                  {isApplyingEditor ? 'Applicazione...' : 'Applica e usa questa planimetria'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pannello Varianti Tavolo */}
      {tavoloVariantiAperto && (
        <PannelloVariantiTavolo
          tavoloNumero={tavoloVariantiAperto.numero}
          tavoloPosti={tavoloVariantiAperto.posti}
          varianti={tavoloVariantiAperto.varianti || {}}
          variantiAttive={variantiAttive}
          onSave={(varianti) => handleSaveVariantiTavolo(tavoloVariantiAperto.id, varianti)}
          onClose={() => setTavoloVariantiAperto(null)}
        />
      )}
    </div>
  )
}
