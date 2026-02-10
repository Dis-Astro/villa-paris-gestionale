'use client'

import { useState, useRef, useEffect } from 'react'
import Tavolo from './Tavolo'
import Stazione from './Stazione'
import PannelloVariantiTavolo from './PannelloVariantiTavolo'
import { Tavolo as TavoloType, Stazione as StazioneType } from '../types/piantina'
import { type VariantId, type VariantiTavolo } from '@/lib/types'
import { Upload, Printer } from 'lucide-react'

export default function VillaPiantina({
  disposizione,
  onChange,
  editabile = true,
  planimetrie = [],
  onNuovaPlanimetria,
  onCambiaPlanimetria,
  onStampa,
  stampaRef,
  variantiAttive = []
}: {
  disposizione: { tavoli: TavoloType[], stazioni: StazioneType[], immagine?: string }
  onChange?: (nuovaDisposizione: { tavoli: TavoloType[], stazioni: StazioneType[], immagine?: string }) => void
  editabile?: boolean
  planimetrie?: { nome: string, url: string }[]
  onNuovaPlanimetria?: (file: File) => void
  onCambiaPlanimetria?: (url: string) => void
  onStampa?: () => void
  stampaRef?: React.RefObject<HTMLDivElement | null>
  variantiAttive?: VariantId[]
}) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(disposizione?.immagine || null)
  const [planimetriaSelezionata, setPlanimetriaSelezionata] = useState<string | null>(null)
  const [tavoloVariantiAperto, setTavoloVariantiAperto] = useState<TavoloType | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBackgroundImage(disposizione?.immagine || null)
  }, [disposizione?.immagine])

  const safeDisposizione = {
    tavoli: Array.isArray(disposizione?.tavoli) ? disposizione.tavoli : [],
    stazioni: Array.isArray(disposizione?.stazioni) ? disposizione.stazioni : [],
    immagine: disposizione?.immagine || undefined
  }

  const handleDragEnd = (tipo: 'tavolo' | 'stazione', id: number, nuovaPosPerc: { x: number, y: number }) => {
    if (!onChange) return
    if (tipo === 'tavolo') {
      const nuoviTavoli = safeDisposizione.tavoli.map(t =>
        t.id === id ? { ...t, posizione: { xPerc: nuovaPosPerc.x, yPerc: nuovaPosPerc.y } } : t
      )
      onChange({ ...safeDisposizione, tavoli: nuoviTavoli, immagine: backgroundImage ?? undefined })
    } else {
      const nuoveStazioni = safeDisposizione.stazioni.map(s =>
        s.id === id ? { ...s, posizione: { xPerc: nuovaPosPerc.x, yPerc: nuovaPosPerc.y } } : s
      )
      onChange({ ...safeDisposizione, stazioni: nuoveStazioni, immagine: backgroundImage ?? undefined })
    }
  }

  const handleRotateTavolo = (id: number, nuovaRotazione: number) => {
    if (!onChange) return
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === id ? { ...t, rotazione: nuovaRotazione } : t
    )
    onChange({ ...safeDisposizione, tavoli: nuoviTavoli, immagine: backgroundImage ?? undefined })
  }

  const handleRotateStazione = (id: number, nuovaRotazione: number) => {
    if (!onChange) return
    const nuoveStazioni = safeDisposizione.stazioni.map(s =>
      s.id === id ? { ...s, rotazione: nuovaRotazione } : s
    )
    onChange({ ...safeDisposizione, stazioni: nuoveStazioni, immagine: backgroundImage ?? undefined })
  }

  const handleDeleteTavolo = (id: number) => {
    if (!onChange) return
    const nuoviTavoli = safeDisposizione.tavoli.filter(t => t.id !== id)
    onChange({ ...safeDisposizione, tavoli: nuoviTavoli, immagine: backgroundImage ?? undefined })
    setSelectedItem(null)
  }

  const handleDeleteStazione = (id: number) => {
    if (!onChange) return
    const nuoveStazioni = safeDisposizione.stazioni.filter(s => s.id !== id)
    onChange({ ...safeDisposizione, stazioni: nuoveStazioni, immagine: backgroundImage ?? undefined })
    setSelectedItem(null)
  }

  const handleRenameTavolo = (id: number, nuovoNome: string) => {
    if (!onChange) return
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === id ? { ...t, numero: nuovoNome } : t
    )
    onChange({ ...safeDisposizione, tavoli: nuoviTavoli, immagine: backgroundImage ?? undefined })
  }

  const handleRenameStazione = (id: number, nuovoNome: string) => {
    if (!onChange) return
    const nuoveStazioni = safeDisposizione.stazioni.map(s =>
      s.id === id ? { ...s, nome: nuovoNome } : s
    )
    onChange({ ...safeDisposizione, stazioni: nuoveStazioni, immagine: backgroundImage ?? undefined })
  }

  // Handler per salvare varianti tavolo
  const handleSaveVariantiTavolo = (tavoloId: number, varianti: VariantiTavolo) => {
    if (!onChange) return
    const nuoviTavoli = safeDisposizione.tavoli.map(t =>
      t.id === tavoloId ? { ...t, varianti } : t
    )
    onChange({ ...safeDisposizione, tavoli: nuoviTavoli, immagine: backgroundImage ?? undefined })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string)
        if (onChange) {
          onChange({
            ...safeDisposizione,
            immagine: event.target?.result as string
          })
        }
        if (onNuovaPlanimetria) {
          onNuovaPlanimetria(file)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleChangePlanimetria = (url: string) => {
    setPlanimetriaSelezionata(url)
    setBackgroundImage(url)
    if (onCambiaPlanimetria) {
      onCambiaPlanimetria(url)
    }
    if (onChange) {
      onChange({
        ...safeDisposizione,
        immagine: url
      })
    }
  }

  // PATCH: posizione di default sempre visibile
  const aggiungiTavolo = () => {
    if (!onChange) return
    const nuovoId = Math.max(0, ...safeDisposizione.tavoli.map(t => t.id || 0)) + 1
    onChange({
      ...safeDisposizione,
      tavoli: [
        ...safeDisposizione.tavoli,
        {
          id: nuovoId,
          numero: `T${nuovoId}`,
          posti: 8,
          posizione: { xPerc: 0.12, yPerc: 0.12 }, // PATCH: fisso e visibile!
          rotazione: 0,
          forma: 'rotondo',
          dimensionePerc: 0.06
        }
      ],
      immagine: backgroundImage ?? undefined
    })
  }

  const aggiungiStazione = () => {
    if (!onChange) return
    const nuovoId = Math.max(0, ...safeDisposizione.stazioni.map(s => s.id || 0)) + 1
    onChange({
      ...safeDisposizione,
      stazioni: [
        ...safeDisposizione.stazioni,
        {
          id: nuovoId,
          nome: `Stazione ${nuovoId}`,
          tipo: 'buffet',
          posizione: { xPerc: 0.18, yPerc: 0.18 }, // PATCH: fisso e visibile!
          rotazione: 0,
          dimensionePerc: { larghezzaPerc: 0.15, altezzaPerc: 0.06 }
        }
      ],
      immagine: backgroundImage
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
            >
              <Printer size={16} />
              <span className="hidden md:inline">Stampa</span>
            </button>
            {planimetrie && planimetrie.length > 0 && (
              <select
                className="border rounded px-2 py-1"
                value={planimetriaSelezionata ?? ''}
                onChange={e => handleChangePlanimetria(e.target.value)}
              >
                <option value="">-- Planimetria --</option>
                {planimetrie.map(p => (
                  <option key={p.url} value={p.url}>{p.nome}</option>
                ))}
              </select>
            )}
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-1"
              onClick={() => fileInputRef.current?.click()}
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
            <button
              className="bg-blue-500 text-white px-3 py-1 rounded"
              onClick={aggiungiTavolo}
            >
              + Tavolo
            </button>
            <button
              className="bg-green-500 text-white px-3 py-1 rounded"
              onClick={aggiungiStazione}
            >
              + Stazione
            </button>
          </>
        )}
      </div>

      {/* PLANIMETRIA */}
      <div className="flex-1">
        <div
          ref={stampaRef || containerRef}
          className="relative border rounded-lg overflow-hidden aspect-[16/9] w-full bg-white"
        >
          {/* Background */}
          <div
            className="absolute inset-0 w-full h-full bg-gray-100"
            style={backgroundImage ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'contain',
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
              onOpenVarianti={() => setTavoloVariantiAperto(tavolo)}
              editabile={editabile}
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
              containerRef={stampaRef || containerRef}
            />
          ))}
        </div>
      </div>

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
