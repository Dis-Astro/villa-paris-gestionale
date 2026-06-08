'use client'

import { useState, useRef, useEffect } from 'react'
import Tavolo from './Tavolo'
import Stazione from './Stazione'
import PannelloVariantiTavolo from './PannelloVariantiTavolo'
import { Tavolo as TavoloType, Stazione as StazioneType } from '../types/piantina'
import { type VariantId, type VariantiTavolo } from '@/lib/types'
import { Upload, Printer, Crop, Lock, Unlock, Grid3X3, Trash2 } from 'lucide-react'

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
  variantiAttive = []
}: {
  disposizione: { tavoli: TavoloType[], stazioni: StazioneType[], immagine?: string, rotazioneImmagine?: number }
  onChange?: (nuovaDisposizione: { tavoli: TavoloType[], stazioni: StazioneType[], immagine?: string, rotazioneImmagine?: number }) => void
  editabile?: boolean
  planimetrie?: { nome: string, url: string }[]
  onNuovaPlanimetria?: (file: File) => void | Promise<void>
  onCambiaPlanimetria?: (url: string) => void
  onDeletePlanimetria?: (url: string) => void | Promise<void>
  onStampa?: () => void
  stampaRef?: React.RefObject<HTMLDivElement>
  variantiAttive?: VariantId[]
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
  const [lockDrag, setLockDrag] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorPreviewRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)

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

  const emitChange = (next: Partial<{ tavoli: TavoloType[]; stazioni: StazioneType[]; immagine?: string; rotazioneImmagine?: number }>) => {
    if (!onChange) return
    onChange({
      ...safeDisposizione,
      immagine: backgroundImage ?? undefined,
      rotazioneImmagine: 0,
      ...next
    })
  }

  const clampTavolo = (value: number) => Math.max(0.02, Math.min(0.18, value))
  const clampStazioneW = (value: number) => Math.max(0.08, Math.min(0.45, value))
  const clampStazioneH = (value: number) => Math.max(0.04, Math.min(0.25, value))

  const selectedTavoloId = selectedItem?.startsWith('tavolo-') ? Number(selectedItem.split('-')[1]) : null
  const selectedStazioneId = selectedItem?.startsWith('stazione-') ? Number(selectedItem.split('-')[1]) : null

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

  // --- UI ---

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-6xl mx-auto">
      {/* SIDEBAR PULSANTI SINISTRA */}
      <div className="flex flex-row md:flex-col gap-2 md:gap-4 md:w-44 items-start">
        {editabile && (
          <>
            <button
              className="bg-white px-4 py-2 rounded shadow flex items-center gap-1 border"
              onClick={() => onStampa && onStampa()}
              data-testid="piantina-stampa-btn"
            >
              <Printer size={16} />
              <span className="hidden md:inline">Stampa</span>
            </button>
            {planimetrie && planimetrie.length > 0 && (
              <div className="w-full space-y-1" data-testid="piantina-library-wrap">
                <select
                  className="border rounded px-2 py-1 w-full text-sm"
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
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs w-full disabled:opacity-40"
                  onClick={handleDeleteSelectedPlanimetria}
                  disabled={!planimetriaSelezionata}
                  data-testid="piantina-delete-selected-btn"
                >
                  <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Elimina planimetria</span>
                </button>
              </div>
            )}
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1"
              onClick={() => fileInputRef.current?.click()}
              data-testid="piantina-upload-bg-btn"
            >
              <Upload size={16} />
              <span className="hidden md:inline">Cambia planimetria</span>
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
                className="bg-amber-500 text-white px-3 py-1 rounded"
                onClick={() => apriEditorSuImmagine(backgroundImage)}
                data-testid="piantina-apri-editor-btn"
              >
                Modifica in griglia
              </button>
            )}
            <div className="grid grid-cols-2 gap-1 w-full" data-testid="piantina-add-elements-row">
              <button
                className="bg-white border text-gray-800 px-2 py-1.5 rounded-lg text-sm"
                onClick={aggiungiTavolo}
                data-testid="piantina-aggiungi-tavolo-btn"
              >
                + Tavolo
              </button>
              <button
                className="bg-amber-50 border border-amber-300 text-amber-800 px-2 py-1.5 rounded-lg text-sm"
                onClick={aggiungiTavoloImperiale}
                data-testid="piantina-aggiungi-imperiale-btn"
              >
                + Imperiale
              </button>
              <button
                className="bg-white border text-gray-800 px-2 py-1.5 rounded-lg text-sm col-span-2"
                onClick={aggiungiStazione}
                data-testid="piantina-aggiungi-stazione-btn"
              >
                + Stazione
              </button>
            </div>

            <div className="w-full border rounded-xl p-2 space-y-2 bg-white/95 shadow-sm" data-testid="piantina-control-panel">
              <div className="grid grid-cols-2 gap-1" data-testid="piantina-segmented-core-controls">
                <button
                  className={`px-2 py-1.5 rounded-lg text-xs border ${lockDrag ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white text-gray-700'}`}
                  onClick={() => setLockDrag((v) => !v)}
                  data-testid="piantina-toggle-lock-drag-btn"
                >
                  <span className="inline-flex items-center gap-1 justify-center w-full">
                    {lockDrag ? <Lock size={12} /> : <Unlock size={12} />} Drag
                  </span>
                </button>
                <button
                  className={`px-2 py-1.5 rounded-lg text-xs border ${snapToGrid ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white text-gray-700'}`}
                  onClick={() => setSnapToGrid((v) => !v)}
                  data-testid="piantina-toggle-snap-grid-btn"
                >
                  <span className="inline-flex items-center gap-1 justify-center w-full"><Grid3X3 size={12} /> Snap</span>
                </button>
              </div>

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
          </>
        )}
      </div>

      {/* PLANIMETRIA */}
      <div className="flex-1">
        <div
          ref={stampaRef || containerRef}
          className="relative border rounded-lg overflow-hidden aspect-[16/9] w-full bg-white"
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
              containerRef={stampaRef || containerRef}
            />
          ))}
        </div>
      </div>

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
