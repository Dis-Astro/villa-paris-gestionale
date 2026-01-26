'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VillaPiantina from '../../../components/VillaPiantina'
import VillaPiantinaDnDWrapper from '../../../components/VillaPiantinaDnDWrapper'
import { Button } from '../../../components/ui/button'
import html2canvas from 'html2canvas'

export default function GestionePiantinaPage() {
  const { id } = useParams()
  const router = useRouter()
  const [evento, setEvento] = useState<any>(null)
  const [disposizione, setDisposizione] = useState<{ tavoli: any[], stazioni: any[], immagine?: string }>({ tavoli: [], stazioni: [], immagine: null })
  const [status, setStatus] = useState('')
  const stampaRef = useRef<HTMLDivElement>(null)

  const aggiornaDisposizione = useCallback((nuova) => {
    setDisposizione(JSON.parse(JSON.stringify(nuova)))
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
        if (data.disposizioneSala && typeof data.disposizioneSala === 'object') {
          setDisposizione({
            tavoli: Array.isArray(data.disposizioneSala.tavoli) ? data.disposizioneSala.tavoli : [],
            stazioni: Array.isArray(data.disposizioneSala.stazioni) ? data.disposizioneSala.stazioni : [],
            immagine: data.disposizioneSala.immagine ?? null
          })
        } else {
          setDisposizione({ tavoli: [], stazioni: [], immagine: null })
        }
      } catch (error) {
        console.error('Errore nel caricamento evento:', error)
      }
    }
    fetchEvento()
  }, [id])

  const handleSave = async () => {
    if (!evento) return
    setStatus('Salvataggio in corso...')
    try {
      const res = await fetch(`/api/eventi?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...evento,
          disposizioneSala: disposizione
        })
      })
      setStatus(res.ok ? '✅ Salvato con successo' : '❌ Errore nel salvataggio')
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      setStatus('❌ Errore nel salvataggio')
    }
  }

  // --- Funzione stampa screenshot planimetria ---
  const handleStampaPlanimetria = async () => {
    if (!stampaRef.current) return
    const canvas = await html2canvas(stampaRef.current)
    const imgData = canvas.toDataURL('image/png')
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write('<img src="' + imgData + '" style="max-width:100%;"/>')
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }
  }

  if (!evento) return <p>Caricamento...</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🪑 Disposizione Sala - {evento.titolo}</h1>
      <div className="flex justify-between">
        <Button onClick={() => router.push(`/modifica-evento/${id}`)} variant="secondary">
          🔙 Torna all'evento
        </Button>
        <Button onClick={handleSave} variant="default">
          💾 Salva disposizione
        </Button>
      </div>
      <VillaPiantinaDnDWrapper>
        <VillaPiantina
          disposizione={disposizione}
          onChange={aggiornaDisposizione}
          editabile={true}
          stampaRef={stampaRef}
          onStampa={handleStampaPlanimetria}
        />
      </VillaPiantinaDnDWrapper>
      {status && <p className="text-sm text-gray-700 mt-2">{status}</p>}
    </div>
  )
}
