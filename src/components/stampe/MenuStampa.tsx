'use client'

import { useState } from 'react'
import { FileText, Printer, Users, Settings, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Evento, VersioneEvento, TipoVersione } from '@/lib/types'
import { generaPDFCliente, generaPDFOperativo, type WatermarkType } from '@/lib/stampa'

interface MenuStampaProps {
  evento: Evento
  onCreaVersione?: (tipo: TipoVersione, tipoDoc: string) => Promise<number>
  isOpen: boolean
  onClose: () => void
}

export default function MenuStampa({ 
  evento, 
  onCreaVersione,
  isOpen, 
  onClose 
}: MenuStampaProps) {
  const [watermark, setWatermark] = useState<WatermarkType>('BOZZA')
  const [isGenerating, setIsGenerating] = useState(false)
  const [versioneCorrente, setVersioneCorrente] = useState(1)

  if (!isOpen) return null

  const handleStampaCliente = async () => {
    setIsGenerating(true)
    try {
      let versione = versioneCorrente
      
      // Crea SEMPRE versione AUTO_PRE_STAMPA per stampa cliente
      if (onCreaVersione) {
        const tipo = watermark === 'BOZZA' ? 'AUTO_PRE_STAMPA' 
          : watermark === 'CONTRATTO' ? 'contratto' : 'definitivo'
        versione = await onCreaVersione(tipo, 'pacchetto_cliente')
        setVersioneCorrente(versione)
      }
      
      generaPDFCliente(evento, {
        watermark,
        includiNote: true,
        versioneNumero: versione
      })
    } catch (error) {
      console.error('Errore generazione PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStampaOperativo = async () => {
    setIsGenerating(true)
    try {
      generaPDFOperativo(evento, {
        watermark: 'BOZZA', // Operativo è sempre bozza (uso interno)
        includiNote: true,
        versioneNumero: versioneCorrente
      })
    } catch (error) {
      console.error('Errore generazione PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="menu-stampa-overlay"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        data-testid="menu-stampa-panel"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Printer className="w-6 h-6" />
            <h2 className="text-lg font-bold">Stampa Documenti</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            data-testid="close-stampa-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selezione Watermark */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Tipo Documento
          </label>
          <div className="flex gap-2">
            {(['BOZZA', 'CONTRATTO', 'DEFINITIVO'] as WatermarkType[]).map((w) => (
              <button
                key={w}
                onClick={() => setWatermark(w)}
                className={`
                  flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all
                  ${watermark === w 
                    ? w === 'BOZZA' ? 'bg-red-100 text-red-700 border-2 border-red-500'
                    : w === 'CONTRATTO' ? 'bg-amber-100 text-amber-700 border-2 border-amber-500'
                    : 'bg-green-100 text-green-700 border-2 border-green-500'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }
                `}
                data-testid={`watermark-${w.toLowerCase()}`}
              >
                {w}
              </button>
            ))}
          </div>
          {watermark !== 'BOZZA' && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ La stampa {watermark} creerà una versione ufficiale dell'evento
            </p>
          )}
        </div>

        {/* Opzioni Stampa */}
        <div className="p-6 space-y-4">
          {/* PDF Cliente */}
          <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Pacchetto Cliente</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Documento contrattuale completo: copertina, menu, piantina, firme
                </p>
                <ul className="text-xs text-gray-400 mt-2 space-y-1">
                  <li>• Copertina elegante con dettagli evento</li>
                  <li>• Menu descrittivo per portata</li>
                  <li>• Disposizione sala (senza varianti)</li>
                  <li>• Pagina conferma e firme</li>
                </ul>
              </div>
            </div>
            <Button
              onClick={handleStampaCliente}
              disabled={isGenerating}
              className="w-full mt-4"
              size="lg"
              data-testid="stampa-cliente-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generazione...' : `Genera PDF Cliente (${watermark})`}
            </Button>
          </div>

          {/* PDF Operativo */}
          <div className="border rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Settings className="w-6 h-6 text-orange-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">Documenti Operativi</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Per lo staff: piantina con varianti, fogli servizio
                </p>
                <ul className="text-xs text-gray-400 mt-2 space-y-1">
                  <li>• Riepilogo varianti alimentari</li>
                  <li>• Piantina con dettaglio varianti per tavolo</li>
                  <li>• Fogli servizio per ogni portata</li>
                  <li>• Checkbox completamento</li>
                </ul>
              </div>
            </div>
            <Button
              onClick={handleStampaOperativo}
              disabled={isGenerating}
              variant="outline"
              className="w-full mt-4"
              size="lg"
              data-testid="stampa-operativo-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generazione...' : 'Genera PDF Operativo'}
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-500">
            Revisione corrente: v{versioneCorrente} • {evento.titolo}
          </p>
        </div>
      </div>
    </div>
  )
}
