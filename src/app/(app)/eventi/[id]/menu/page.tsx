'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown,
  Save,
  ArrowLeft,
  Check
} from 'lucide-react'
import {
  type MenuEvento,
  type Portata,
  type VariantId,
  VARIANTI_DEFAULT,
  VARIANT_IDS
} from '@/lib/types'

// ============================================
// MENU EVENTO PAGE - STEP 2
// ============================================

export default function MenuEventoPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [evento, setEvento] = useState<any>(null)
  const [menu, setMenu] = useState<MenuEvento>({
    portate: [],
    variantiAttive: [],
    note: ''
  })
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Carica evento
  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const res = await fetch(`/api/eventi?id=${id}`)
        if (!res.ok) throw new Error('Errore caricamento')
        const data = await res.json()
        setEvento(data)
        
        // Carica menu esistente o inizializza vuoto
        if (data.menu && data.menu.portate) {
          setMenu(data.menu as MenuEvento)
        }
      } catch (error) {
        console.error('Errore:', error)
        setStatus('❌ Errore nel caricamento evento')
      }
    }
    fetchEvento()
  }, [id])

  // Salva menu
  const handleSave = async () => {
    if (!evento) return
    setIsSaving(true)
    setStatus('Salvataggio...')
    
    try {
      const res = await fetch(`/api/eventi?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...evento,
          menu
        })
      })
      
      if (res.ok) {
        setStatus('✅ Menu salvato')
        setTimeout(() => setStatus(''), 2000)
      } else {
        setStatus('❌ Errore nel salvataggio')
      }
    } catch (error) {
      setStatus('❌ Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================
  // GESTIONE PORTATE
  // ============================================
  
  const aggiungiPortata = () => {
    const nuovaPortata: Portata = {
      id: `portata_${Date.now()}`,
      nome: '',
      ordine: menu.portate.length + 1,
      descrizione: ''
    }
    setMenu(prev => ({
      ...prev,
      portate: [...prev.portate, nuovaPortata]
    }))
  }

  const aggiornaPortata = (portataId: string, campo: keyof Portata, valore: any) => {
    setMenu(prev => ({
      ...prev,
      portate: prev.portate.map(p => 
        p.id === portataId ? { ...p, [campo]: valore } : p
      )
    }))
  }

  const eliminaPortata = (portataId: string) => {
    setMenu(prev => {
      const nuovePortate = prev.portate
        .filter(p => p.id !== portataId)
        .map((p, idx) => ({ ...p, ordine: idx + 1 }))
      return { ...prev, portate: nuovePortate }
    })
  }

  const spostaPortata = (portataId: string, direzione: 'su' | 'giu') => {
    setMenu(prev => {
      const portate = [...prev.portate]
      const idx = portate.findIndex(p => p.id === portataId)
      if (idx === -1) return prev
      
      const newIdx = direzione === 'su' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= portate.length) return prev
      
      // Scambia
      const temp = portate[idx]
      portate[idx] = portate[newIdx]
      portate[newIdx] = temp
      
      // Ricalcola ordine e ritorna MenuEvento completo
      const nuovePortate = portate.map((p, i) => ({ ...p, ordine: i + 1 }))
      return {
        portate: nuovePortate,
        variantiAttive: prev.variantiAttive,
        note: prev.note
      }
    })
  }

  // ============================================
  // GESTIONE VARIANTI
  // ============================================

  const toggleVariante = (variantId: VariantId) => {
    setMenu(prev => {
      const attive = prev.variantiAttive.includes(variantId)
        ? prev.variantiAttive.filter(v => v !== variantId)
        : [...prev.variantiAttive, variantId]
      return { ...prev, variantiAttive: attive }
    })
  }

  // ============================================
  // RENDER
  // ============================================

  if (!evento) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Caricamento...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button 
              variant="ghost" 
              onClick={() => router.push(`/modifica-evento/${id}`)}
              className="mb-2"
              data-testid="back-to-event-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna all'evento
            </Button>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="menu-page-title">
              Menu Evento
            </h1>
            <p className="text-gray-600">{evento.titolo}</p>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            size="lg"
            className="w-full sm:w-auto"
            data-testid="save-menu-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Menu'}
          </Button>
        </div>
        
        {status && (
          <p className="mt-2 text-sm font-medium" data-testid="status-message">
            {status}
          </p>
        )}
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Sezione Varianti Attive */}
        <Card data-testid="varianti-section">
          <CardHeader>
            <CardTitle className="text-lg">Varianti Disponibili</CardTitle>
            <p className="text-sm text-gray-500">
              Seleziona le varianti alimentari disponibili per questo evento
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {VARIANT_IDS.map(variantId => {
                const variante = VARIANTI_DEFAULT[variantId]
                const isAttiva = menu.variantiAttive.includes(variantId)
                
                return (
                  <button
                    key={variantId}
                    onClick={() => toggleVariante(variantId)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg border-2 
                      transition-all text-sm font-medium
                      ${isAttiva 
                        ? 'border-current bg-opacity-10' 
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }
                    `}
                    style={isAttiva ? { 
                      borderColor: variante.colore,
                      backgroundColor: `${variante.colore}15`,
                      color: variante.colore
                    } : {}}
                    data-testid={`variante-toggle-${variantId}`}
                  >
                    {isAttiva && <Check className="w-4 h-4" />}
                    {variante.nome}
                  </button>
                )
              })}
            </div>
            
            {menu.variantiAttive.length > 0 && (
              <p className="mt-3 text-sm text-gray-500">
                {menu.variantiAttive.length} varianti selezionate
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sezione Portate */}
        <Card data-testid="portate-section">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Portate</CardTitle>
              <p className="text-sm text-gray-500">
                Aggiungi e ordina le portate del menu
              </p>
            </div>
            <Button 
              onClick={aggiungiPortata}
              data-testid="add-portata-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Portata
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {menu.portate.length === 0 ? (
              <div className="text-center py-8 text-gray-500" data-testid="empty-portate">
                <p>Nessuna portata inserita</p>
                <p className="text-sm">Clicca "Aggiungi Portata" per iniziare</p>
              </div>
            ) : (
              menu.portate
                .sort((a, b) => a.ordine - b.ordine)
                .map((portata, idx) => (
                  <PortataCard
                    key={portata.id}
                    portata={portata}
                    isFirst={idx === 0}
                    isLast={idx === menu.portate.length - 1}
                    onUpdate={(campo, valore) => aggiornaPortata(portata.id, campo, valore)}
                    onDelete={() => eliminaPortata(portata.id)}
                    onMove={(dir) => spostaPortata(portata.id, dir)}
                  />
                ))
            )}
          </CardContent>
        </Card>

        {/* Note Menu */}
        <Card data-testid="note-section">
          <CardHeader>
            <CardTitle className="text-lg">Note Generali</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={menu.note || ''}
              onChange={(e) => setMenu(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Note aggiuntive per il menu (allergie particolari, richieste speciali, etc.)"
              rows={3}
              data-testid="menu-note-input"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================
// COMPONENTE PORTATA
// ============================================

interface PortataCardProps {
  portata: Portata
  isFirst: boolean
  isLast: boolean
  onUpdate: (campo: keyof Portata, valore: any) => void
  onDelete: () => void
  onMove: (direzione: 'su' | 'giu') => void
}

function PortataCard({ 
  portata, 
  isFirst, 
  isLast, 
  onUpdate, 
  onDelete, 
  onMove 
}: PortataCardProps) {
  return (
    <div 
      className="flex gap-3 p-4 bg-white border rounded-lg shadow-sm"
      data-testid={`portata-card-${portata.id}`}
    >
      {/* Handle riordino */}
      <div className="flex flex-col items-center justify-center gap-1 text-gray-400">
        <GripVertical className="w-5 h-5" />
        <span className="text-xs font-bold text-gray-500">{portata.ordine}</span>
        <div className="flex flex-col gap-1 mt-1">
          <button
            onClick={() => onMove('su')}
            disabled={isFirst}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            data-testid={`move-up-${portata.id}`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove('giu')}
            disabled={isLast}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
            data-testid={`move-down-${portata.id}`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenuto portata */}
      <div className="flex-1 space-y-3">
        <Input
          value={portata.nome}
          onChange={(e) => onUpdate('nome', e.target.value)}
          placeholder="Nome portata (es. Antipasto, Primo, Secondo...)"
          className="text-lg font-medium"
          data-testid={`portata-nome-${portata.id}`}
        />
        <Textarea
          value={portata.descrizione || ''}
          onChange={(e) => onUpdate('descrizione', e.target.value)}
          placeholder="Descrizione della portata (piatti inclusi, ingredienti principali...)"
          rows={2}
          data-testid={`portata-descrizione-${portata.id}`}
        />
      </div>

      {/* Azioni */}
      <div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          data-testid={`delete-portata-${portata.id}`}
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
