'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VillaPiantina from '../../../components/VillaPiantina'
import VillaPiantinaDnDWrapper from '../../../components/VillaPiantinaDnDWrapper'
import { Button } from '../../../components/ui/button'
import { type VariantId, calcolaRiepilogoVarianti, VARIANTI_DEFAULT } from '@/lib/types'
import html2canvas from 'html2canvas'

export default function GestionePiantinaPage() {
  const { id } = useParams()
  const router = useRouter()
  const [evento, setEvento] = useState<any>(null)
  const [disposizione, setDisposizione] = useState<{ tavoli: any[], stazioni: any[], immagine?: string }>({ tavoli: [], stazioni: [], immagine: undefined })
  const [variantiAttive, setVariantiAttive] = useState<VariantId[]>([])
  const [status, setStatus] = useState('')
  const stampaRef = useRef<HTMLDivElement>(null)

  const aggiornaDisposizione = useCallback((nuova: any) => {
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
        
        // Carica varianti attive dal menu evento
        if (data.menu?.variantiAttive) {
          setVariantiAttive(data.menu.variantiAttive)
        }
        
        if (data.disposizioneSala && typeof data.disposizioneSala === 'object') {
          setDisposizione({
            tavoli: Array.isArray(data.disposizioneSala.tavoli) ? data.disposizioneSala.tavoli : [],
            stazioni: Array.isArray(data.disposizioneSala.stazioni) ? data.disposizioneSala.stazioni : [],
            immagine: data.disposizioneSala.immagine ?? undefined
          })
        } else {
          setDisposizione({ tavoli: [], stazioni: [], immagine: undefined })
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
      setTimeout(() => setStatus(''), 2000)
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

  // Calcola riepilogo varianti
  const riepilogo = calcolaRiepilogoVarianti(disposizione)

  if (!evento) return <p>Caricamento...</p>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold" data-testid="piantina-title">🪑 Disposizione Sala - {evento.titolo}</h1>
      
      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button onClick={() => router.push(`/modifica-evento/${id}`)} variant="secondary">
            🔙 Torna all'evento
          </Button>
          <Button onClick={() => router.push(`/eventi/${id}/menu`)} variant="outline">
            🍽️ Menu
          </Button>
        </div>
        <Button onClick={handleSave} variant="default" data-testid="save-piantina-btn">
          💾 Salva disposizione
        </Button>
      </div>

      {/* Riepilogo varianti */}
      {riepilogo.tavoliConVarianti > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="riepilogo-varianti">
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
        </div>
      )}

      {/* Istruzioni */}
      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        💡 <strong>Tip:</strong> Seleziona un tavolo e clicca 🍽️ oppure fai <strong>doppio click</strong> per gestire le varianti
      </div>

      <VillaPiantinaDnDWrapper>
        <VillaPiantina
          disposizione={disposizione}
          onChange={aggiornaDisposizione}
          editabile={true}
          stampaRef={stampaRef}
          onStampa={handleStampaPlanimetria}
          variantiAttive={variantiAttive}
        />
      </VillaPiantinaDnDWrapper>
      {status && <p className="text-sm text-gray-700 mt-2" data-testid="status-message">{status}</p>}
    </div>
  )
}
