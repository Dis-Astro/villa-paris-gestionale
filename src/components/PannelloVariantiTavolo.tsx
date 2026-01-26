'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { 
  type VariantId, 
  type VariantiTavolo,
  VARIANT_IDS, 
  VARIANTI_DEFAULT 
} from '@/lib/types'

interface PannelloVariantiTavoloProps {
  tavoloNumero: string
  tavoloPosti: number
  varianti: VariantiTavolo
  variantiAttive?: VariantId[]  // Varianti attive per l'evento (dal menu)
  onSave: (varianti: VariantiTavolo) => void
  onClose: () => void
}

export default function PannelloVariantiTavolo({
  tavoloNumero,
  tavoloPosti,
  varianti,
  variantiAttive,
  onSave,
  onClose
}: PannelloVariantiTavoloProps) {
  const [localVarianti, setLocalVarianti] = useState<VariantiTavolo>(varianti || {})

  // Usa tutte le varianti se non sono specificate quelle attive
  const variantiDaMostrare = variantiAttive && variantiAttive.length > 0 
    ? variantiAttive 
    : VARIANT_IDS

  const handleQuantityChange = (variantId: VariantId, value: string) => {
    const qty = parseInt(value) || 0
    setLocalVarianti(prev => {
      if (qty <= 0) {
        const { [variantId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [variantId]: qty }
    })
  }

  const getTotaleVarianti = () => {
    return Object.values(localVarianti).reduce((sum, val) => sum + (val || 0), 0)
  }

  const handleSave = () => {
    // Rimuovi varianti con valore 0 o undefined
    const cleanedVarianti: VariantiTavolo = {}
    for (const [key, value] of Object.entries(localVarianti)) {
      if (value && value > 0) {
        cleanedVarianti[key as VariantId] = value
      }
    }
    onSave(cleanedVarianti)
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="varianti-panel-overlay"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
        data-testid="varianti-panel"
      >
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900" data-testid="panel-title">
              Varianti Tavolo {tavoloNumero}
            </h2>
            <p className="text-sm text-gray-500">
              {tavoloPosti} posti • {getTotaleVarianti()} varianti inserite
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            data-testid="close-panel-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Lista Varianti */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="space-y-3">
            {variantiDaMostrare.map(variantId => {
              const variante = VARIANTI_DEFAULT[variantId]
              const currentQty = localVarianti[variantId] || 0
              
              return (
                <div 
                  key={variantId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                  data-testid={`variante-row-${variantId}`}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: variante.colore }}
                    />
                    <div>
                      <span className="font-medium text-gray-900">{variante.nome}</span>
                      <span className="text-xs text-gray-500 ml-2">({variante.nomeStampa})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(variantId, String(Math.max(0, currentQty - 1)))}
                      className="w-10 h-10 flex items-center justify-center bg-white border rounded-lg text-xl font-bold hover:bg-gray-100 active:bg-gray-200"
                      data-testid={`decrease-${variantId}`}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={tavoloPosti}
                      value={currentQty || ''}
                      onChange={(e) => handleQuantityChange(variantId, e.target.value)}
                      className="w-16 h-10 text-center border rounded-lg text-lg font-semibold"
                      placeholder="0"
                      data-testid={`input-${variantId}`}
                    />
                    <button
                      onClick={() => handleQuantityChange(variantId, String(currentQty + 1))}
                      className="w-10 h-10 flex items-center justify-center bg-white border rounded-lg text-xl font-bold hover:bg-gray-100 active:bg-gray-200"
                      data-testid={`increase-${variantId}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Warning se supera i posti */}
          {getTotaleVarianti() > tavoloPosti && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              ⚠️ Attenzione: il totale varianti ({getTotaleVarianti()}) supera i posti del tavolo ({tavoloPosti})
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border rounded-lg font-medium hover:bg-gray-100 transition-colors"
            data-testid="cancel-btn"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            data-testid="save-varianti-btn"
          >
            Salva Varianti
          </button>
        </div>
      </div>
    </div>
  )
}
