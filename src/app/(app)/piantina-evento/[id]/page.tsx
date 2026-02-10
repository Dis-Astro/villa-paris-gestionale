'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import VillaPiantina from '@/components/VillaPiantina'
import VillaPiantinaDnDWrapper from '@/components/VillaPiantinaDnDWrapper'
import { type VariantId, calcolaRiepilogoVarianti, VARIANTI_DEFAULT } from '@/lib/types'
import html2canvas from 'html2canvas'
import { 
  Layout, 
  Save, 
  ArrowLeft, 
  UtensilsCrossed,
  Info,
  Printer
} from 'lucide-react'

export default function GestionePiantinaPage() {
  const { id } = useParams()
  const router = useRouter()
  const [evento, setEvento] = useState<any>(null)
  const [disposizione, setDisposizione] = useState<{ tavoli: any[], stazioni: any[], immagine?: string }>({ tavoli: [], stazioni: [], immagine: undefined })
  const [variantiAttive, setVariantiAttive] = useState<VariantId[]>([])
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)
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
    setIsSaving(true)
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
    } finally {
      setIsSaving(false)
    }
  }

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

  const riepilogo = calcolaRiepilogoVarianti(disposizione)

  if (!evento) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="piantina-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/modifica-evento/${id}`)}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna all'evento
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2" data-testid="piantina-title">
            <Layout className="w-7 h-7 text-amber-500" />
            Disposizione Sala
          </h1>
          <p className="text-gray-500">{evento.titolo}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/eventi/${id}/menu`)}
          >
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600"
            data-testid="save-piantina-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </div>

      {/* Status */}
      {status && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          status.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`} data-testid="status-message">
          {status}
        </div>
      )}

      {/* Riepilogo varianti */}
      {riepilogo.tavoliConVarianti > 0 && (
        <Card className="bg-blue-50 border-blue-200" data-testid="riepilogo-varianti">
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

      {/* Istruzioni */}
      <Card className="bg-gray-50">
        <CardContent className="p-4 flex items-center gap-3">
          <Info className="w-5 h-5 text-gray-500" />
          <p className="text-sm text-gray-600">
            <strong>Tip:</strong> Seleziona un tavolo e clicca 🍽️ oppure fai <strong>doppio click</strong> per gestire le varianti alimentari
          </p>
        </CardContent>
      </Card>

      {/* Piantina */}
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>
    </div>
  )
}
