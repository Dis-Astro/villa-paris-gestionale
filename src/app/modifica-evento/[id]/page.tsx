'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MenuSelezione from '@/components/MenuSelezione'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import MenuBaseSelector from '@/components/MenuBaseSelector'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'
import MenuStampa from '@/components/stampe/MenuStampa'
import BannerBlocco, { getOverrideHeaders, clearOverrideHeaders } from '@/components/BannerBlocco'
import type { TipoVersione } from '@/lib/types'

interface InfoBlocco {
  isBloccato: boolean
  giorniMancanti: number
  dataEvento: string | null
  messaggioBlocco: string
}

export default function ModificaEventoPage() {
  const { id } = useParams()
  const router = useRouter()
  const [evento, setEvento] = useState<any>(null)
  const [infoBlocco, setInfoBlocco] = useState<InfoBlocco | null>(null)
  const [versioneCorrente, setVersioneCorrente] = useState(1)
  const [status, setStatus] = useState('')
  const [showStampa, setShowStampa] = useState(false)
  const stampaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchEvento = async () => {
      const res = await fetch(`/api/eventi?id=${id}`)
      const data = await res.json()

      if (!Array.isArray(data.dateProposte)) {
        data.dateProposte = []
      }
      data.dataConfermata = data.dataConfermata ? data.dataConfermata.slice(0, 10) : ''
      data.menu = data.menu || {}
      data.struttura = data.struttura || {}
      data.disposizioneSala = data.disposizioneSala || { tavoli: [], stazioni: [], immagine: '' }
      
      // Estrai info blocco e versione
      if (data._blocco) {
        setInfoBlocco(data._blocco)
      }
      if (data._versioneCorrente) {
        setVersioneCorrente(data._versioneCorrente)
      }
      
      setEvento(data)
    }
    fetchEvento()
  }, [id])

  const handleChange = (e: any) => {
    if (!evento) return
    const value = e.target.value
    const name = e.target.name
    const resetMenu = name === 'dataConfermata' && !value ? {} : evento.menu
    setEvento({ ...evento, [name]: value, menu: resetMenu })
  }

  const aggiornaMenu = (menu: Record<string, string[]>) => {
    if (!evento) return
    setEvento({ ...evento, menu })
  }

  const aggiornaStruttura = (struttura: any) => {
    if (!evento) return
    setEvento({ ...evento, struttura })
  }

  const aggiungiDataProposta = () => {
    const nuovaData = prompt("Inserisci nuova data opzionata (YYYY-MM-DD)")
    if (
      nuovaData &&
      Array.isArray(evento.dateProposte) &&
      !evento.dateProposte.includes(nuovaData)
    ) {
      setEvento({ ...evento, dateProposte: [...evento.dateProposte, nuovaData] })
    }
  }

  const rimuoviDataProposta = (data: string) => {
    const nuove = Array.isArray(evento.dateProposte)
      ? evento.dateProposte.filter((d: string) => d !== data)
      : []
    const dataConfermata = evento.dataConfermata === data ? '' : evento.dataConfermata
    const menu = dataConfermata ? evento.menu : {}
    setEvento({ ...evento, dateProposte: nuove, dataConfermata, menu })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Salvataggio in corso...')

    // Aggiungi headers override se presenti
    const overrideHeaders = getOverrideHeaders()

    const res = await fetch(`/api/eventi?id=${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...overrideHeaders
      },
      body: JSON.stringify({
        tipo: evento.tipo,
        titolo: evento.titolo,
        dataConfermata: evento.dataConfermata || null,
        fascia: evento.fascia,
        stato: evento.stato,
        personePreviste: evento.personePreviste ? parseInt(evento.personePreviste) : null,
        note: evento.note,
        menu: evento.menu,
        struttura: evento.struttura,
        dateProposte: evento.dateProposte,
        disposizioneSala: evento.disposizioneSala || null
      })
    })

    if (res.status === 423) {
      const errorData = await res.json()
      setStatus(`🔒 ${errorData.message}`)
      return
    }

    // Pulisci override headers dopo uso
    clearOverrideHeaders()
    setStatus(res.ok ? '✅ Modificato con successo' : '❌ Errore nel salvataggio')
  }

  // Crea versione per stampa (AUTO_PRE_STAMPA o contratto/definitivo)
  const handleCreaVersione = async (tipo: string, tipoDoc: string): Promise<number> => {
    try {
      // Mappa tipo a watermark
      const watermark = tipo === 'AUTO_PRE_STAMPA' ? 'BOZZA' 
        : tipo === 'contratto' ? 'CONTRATTO' : 'DEFINITIVO'
      
      const res = await fetch('/api/versioni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId: id,
          tipo,
          watermark,
          commento: `Stampa ${tipo} - ${tipoDoc}`
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setVersioneCorrente(data.numero)
        return data.numero
      }
      return versioneCorrente
    } catch (error) {
      console.error('Errore creazione versione:', error)
      return versioneCorrente
    }
  }

  const generaPDF = async () => {
    if (!stampaRef.current) return
    const canvas = await html2canvas(stampaRef.current)
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF()
    const width = pdf.internal.pageSize.getWidth()
    const height = (canvas.height * width) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, width, height)
    pdf.save(`menu_evento_${evento?.id}.pdf`)
  }

  if (!evento) return <p>Caricamento...</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">✏️ Modifica Evento</h1>

      {/* Banner Blocco -10 giorni */}
      {infoBlocco && (
        <BannerBlocco 
          infoBlocco={infoBlocco} 
          onOverrideSuccess={() => setStatus('🔓 Override attivato. Puoi salvare le modifiche.')}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => router.push('/calendario')} variant="secondary">
          🔙 Torna al Calendario
        </Button>
        <Button
          onClick={() => router.push(`/eventi/${id}/menu`)}
          variant="outline"
          data-testid="gestione-menu-btn"
        >
          🍽️ Gestione Menu
        </Button>
        <Button
          onClick={() => router.push(`/piantina-evento/${id}`)}
          variant="outline"
        >
          🪑 Gestione Piantina Sala
        </Button>
        <Button
          onClick={() => setShowStampa(true)}
          variant="default"
          className="bg-blue-700 hover:bg-blue-800"
          data-testid="stampa-documenti-btn"
        >
          <Printer className="w-4 h-4 mr-2" />
          🖨️ Stampa Documenti
        </Button>
      </div>

      <button
        type="button"
        onClick={generaPDF}
        className="bg-red-600 text-white px-4 py-2 rounded mb-4"
      >
        🖨️ Stampa Menù
      </button>

      <div ref={stampaRef}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="titolo" value={evento.titolo} onChange={handleChange} required className="border p-2 w-full" />
          <select name="tipo" value={evento.tipo} onChange={handleChange} className="border p-2 w-full">
            <option value="Matrimonio">Matrimonio</option>
            <option value="Compleanno">Compleanno</option>
            <option value="Comunione">Comunione</option>
            <option value="Festa Privata/Aziendale">Festa Privata/Aziendale</option>
          </select>
          <select name="fascia" value={evento.fascia} onChange={handleChange} className="border p-2 w-full">
            <option value="pranzo">Pranzo</option>
            <option value="cena">Cena</option>
          </select>
          <select name="stato" value={evento.stato} onChange={handleChange} className="border p-2 w-full">
            <option value="in_attesa">🟡 In attesa</option>
            <option value="confermato">🟢 Confermato</option>
            <option value="annullato">🔴 Annullato</option>
          </select>
          <input name="personePreviste" type="number" placeholder="Numero invitati" value={evento.personePreviste ?? ''} onChange={handleChange} className="border p-2 w-full" />
          <textarea name="note" value={evento.note} onChange={handleChange} rows={4} className="border p-2 w-full" />

          <div className="border p-2 rounded">
            <label className="block font-semibold mb-2">📅 Date proposte:</label>
            <ul className="space-y-1">
              {Array.isArray(evento.dateProposte) && evento.dateProposte.map((d: string) => (
                <li key={d} className="flex items-center gap-2">
                  <span className="text-sm">{d}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => rimuoviDataProposta(d)}>
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <Button type="button" onClick={aggiungiDataProposta} className="mt-2">
              ➕ Aggiungi Data Opzionata
            </Button>
          </div>

          <div className="border p-2 rounded">
            <label className="block font-semibold mb-2">📅 Scegli data confermata:</label>
            <select
              name="dataConfermata"
              value={evento.dataConfermata || ''}
              onChange={handleChange}
              className="border p-2 w-full"
            >
              <option value="">-- Nessuna --</option>
              {Array.isArray(evento.dateProposte) && evento.dateProposte.map((d: string) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {evento.dataConfermata && (
            <>
              {!evento.struttura || Object.keys(evento.struttura).length === 0 ? (
                <MenuBaseSelector
                  current={evento.menu}
                  onLoad={(struttura, selezione) => {
                    aggiornaStruttura(struttura)
                    aggiornaMenu(selezione)
                  }}
                />
              ) : null}

              <MenuSelezione
                struttura={evento.struttura || {}}
                selezione={evento.menu || {}}
                onChange={aggiornaMenu}
              />
            </>
          )}

          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            💾 Salva modifiche
          </button>
        </form>
      </div>

      {status && <p className="text-sm text-gray-700 mt-2">{status}</p>}
      {/* Menu Stampa Modal */}
      <MenuStampa
        evento={evento}
        onCreaVersione={handleCreaVersione}
        isOpen={showStampa}
        onClose={() => setShowStampa(false)}
      />
    </div>
  )
}
