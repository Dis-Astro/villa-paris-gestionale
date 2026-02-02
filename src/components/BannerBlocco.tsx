'use client'

import { useState } from 'react'
import { AlertTriangle, Lock, Unlock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OVERRIDE_HEADERS, OVERRIDE_TOKEN_VALID } from '@/lib/blocco-evento'

interface InfoBlocco {
  isBloccato: boolean
  giorniMancanti: number
  dataEvento: string | null
  messaggioBlocco: string
}

interface BannerBloccoProps {
  infoBlocco: InfoBlocco
  onOverrideSuccess?: () => void
}

export default function BannerBlocco({ infoBlocco, onOverrideSuccess }: BannerBloccoProps) {
  const [showOverrideModal, setShowOverrideModal] = useState(false)

  if (!infoBlocco.isBloccato) return null

  return (
    <>
      {/* Banner principale */}
      <div 
        className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-4"
        data-testid="banner-blocco"
      >
        <div className="flex items-start gap-3">
          <Lock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-800">
              Evento Bloccato
            </h3>
            <p className="text-amber-700 text-sm mt-1">
              Mancano <strong>{infoBlocco.giorniMancanti} giorni</strong> all'evento. 
              Le modifiche a menu, note, piantina e varianti sono bloccate.
            </p>
            <p className="text-amber-600 text-xs mt-2">
              Per modificare è necessario un override amministrativo con motivazione.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOverrideModal(true)}
            className="border-amber-500 text-amber-700 hover:bg-amber-100"
            data-testid="btn-richiedi-override"
          >
            <Unlock className="w-4 h-4 mr-1" />
            Override
          </Button>
        </div>
      </div>

      {/* Modal Override */}
      {showOverrideModal && (
        <OverrideModal
          onClose={() => setShowOverrideModal(false)}
          onSuccess={() => {
            setShowOverrideModal(false)
            onOverrideSuccess?.()
          }}
        />
      )}
    </>
  )
}

// ============================================
// MODAL OVERRIDE
// ============================================

interface OverrideModalProps {
  onClose: () => void
  onSuccess: () => void
}

function OverrideModal({ onClose, onSuccess }: OverrideModalProps) {
  const [token, setToken] = useState('')
  const [motivo, setMotivo] = useState('')
  const [autore, setAutore] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopyHeaders = () => {
    const headers = `${OVERRIDE_HEADERS.TOKEN}: ${token}
${OVERRIDE_HEADERS.MOTIVO}: ${motivo}
${OVERRIDE_HEADERS.AUTORE}: ${autore || 'Admin'}`
    
    navigator.clipboard.writeText(headers)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const validateAndClose = () => {
    if (token !== OVERRIDE_TOKEN_VALID) {
      setError('Token non valido')
      return
    }
    if (motivo.trim().length < 10) {
      setError('Il motivo deve essere di almeno 10 caratteri')
      return
    }
    
    // Salva in sessionStorage per le prossime richieste
    sessionStorage.setItem('override_token', token)
    sessionStorage.setItem('override_motivo', motivo)
    sessionStorage.setItem('override_autore', autore || 'Admin')
    
    onSuccess()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="override-modal-overlay"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
        data-testid="override-modal"
      >
        {/* Header */}
        <div className="bg-amber-500 px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-lg font-bold">Override Amministrativo</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            data-testid="close-override-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Inserisci le credenziali di override per sbloccare temporaneamente 
            le modifiche. L'operazione verrà registrata.
          </p>

          {/* Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token Admin *
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Inserisci token override"
              className="w-full px-4 py-3 border rounded-lg text-lg"
              data-testid="input-override-token"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo Override * <span className="text-gray-400">(min. 10 caratteri)</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Es: Modifica urgente richiesta dal cliente per cambio menu..."
              rows={3}
              className="w-full px-4 py-3 border rounded-lg"
              data-testid="input-override-motivo"
            />
            <p className="text-xs text-gray-400 mt-1">
              {motivo.length}/10 caratteri minimi
            </p>
          </div>

          {/* Autore */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Operatore
            </label>
            <input
              type="text"
              value={autore}
              onChange={(e) => setAutore(e.target.value)}
              placeholder="Es: Mario Rossi"
              className="w-full px-4 py-3 border rounded-lg"
              data-testid="input-override-autore"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            data-testid="btn-annulla-override"
          >
            Annulla
          </Button>
          <Button
            onClick={validateAndClose}
            className="flex-1 bg-amber-500 hover:bg-amber-600"
            data-testid="btn-conferma-override"
          >
            <Unlock className="w-4 h-4 mr-2" />
            Sblocca Modifiche
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HELPER: Aggiungi headers override alle fetch
// ============================================

export function getOverrideHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('override_token')
  const motivo = sessionStorage.getItem('override_motivo')
  const autore = sessionStorage.getItem('override_autore')

  if (!token || !motivo) return {}

  return {
    [OVERRIDE_HEADERS.TOKEN]: token,
    [OVERRIDE_HEADERS.MOTIVO]: motivo,
    [OVERRIDE_HEADERS.AUTORE]: autore || 'Admin'
  }
}

export function clearOverrideHeaders(): void {
  sessionStorage.removeItem('override_token')
  sessionStorage.removeItem('override_motivo')
  sessionStorage.removeItem('override_autore')
}
