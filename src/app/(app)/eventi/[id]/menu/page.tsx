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
import {
  buildMenuEventoFromStruttura,
  normalizeStrutturaMenuBase,
  normalizeMenuEvento,
  parseListaPietanzeDaDescrizione,
  REGOLE_CATEGORIE
} from '@/lib/menu-utils'

const CATEGORIA_DA_NOME: Record<string, string> = {
  antipasti: 'antipasto',
  antipasto: 'antipasto',
  primi: 'primo',
  primo: 'primo',
  secondi: 'secondo',
  secondo: 'secondo',
  contorni: 'contorno',
  contorno: 'contorno',
  dolci: 'dolce',
  dolce: 'dolce',
  bevande: 'bevanda',
  bevanda: 'bevanda',
  altro: 'altro'
}

export default function MenuEventoPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [evento, setEvento] = useState<any>(null)
  const [menu, setMenu] = useState<MenuEvento>({
    portate: [],
    variantiAttive: [],
    note: ''
  })
  const [struttura, setStruttura] = useState<any>({})
  const [extraInputs, setExtraInputs] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Carica evento
  useEffect(() => {
    const fetchEvento = async () => {
      try {
        const res = await fetch(`/api/eventi?id=${id}`)
        if (!res.ok) throw new Error('Errore caricamento')
        const data = await res.json()

        const menuRaw = typeof data.menu === 'string'
          ? (() => {
              try { return JSON.parse(data.menu || '{}') } catch { return {} }
            })()
          : (data.menu || {})

        const strutturaRaw = normalizeStrutturaMenuBase(data.struttura)
        const menuNormalizzato = normalizeMenuEvento(menuRaw)
        const menuDaStruttura = buildMenuEventoFromStruttura(strutturaRaw)

        let menuFinale = menuDaStruttura

        if (Array.isArray(menuNormalizzato.portate) && menuNormalizzato.portate.length > 0) {
          const haPiattiInMenu = menuNormalizzato.portate.some((p) => Array.isArray(p.piatti) && p.piatti.length > 0)
          if (haPiattiInMenu) {
            menuFinale = menuNormalizzato
          } else {
            // retro-compatibilità: menu vecchio con solo descrizione testuale
            const mergedPortate = menuDaStruttura.portate.map((portataBase) => {
              const portataOld = menuNormalizzato.portate.find((p) => p.nome.toLowerCase() === portataBase.nome.toLowerCase())
              const selectedNames = parseListaPietanzeDaDescrizione(portataOld?.descrizione)
              if (!selectedNames.length) return portataBase

              return {
                ...portataBase,
                piatti: (portataBase.piatti || []).map((piatto) => ({
                  ...piatto,
                  selezionato: selectedNames.includes(piatto.nome)
                }))
              }
            })

            menuFinale = {
              portate: mergedPortate,
              variantiAttive: menuNormalizzato.variantiAttive,
              note: menuNormalizzato.note
            }
          }
        }

        setEvento(data)
        setStruttura(strutturaRaw)
        
        setMenu(menuFinale)
      } catch (error) {
        console.error('Errore:', error)
        setStatus('❌ Errore nel caricamento evento')
      }
    }
    fetchEvento()
  }, [id])

  const getCategoriaPortata = useCallback((portata: Portata): string => {
    const categoriaDaPiatto = (portata.piatti || []).find((p) => p.categoria)?.categoria
    if (categoriaDaPiatto) return categoriaDaPiatto
    const nome = (portata.nome || '').toLowerCase()
    const key = Object.keys(CATEGORIA_DA_NOME).find((k) => nome.includes(k))
    return key ? CATEGORIA_DA_NOME[key] : 'altro'
  }, [])

  const getLimitePortata = useCallback((portata: Portata): number | null => {
    const categoria = getCategoriaPortata(portata)
    const regolaKey = REGOLE_CATEGORIE[categoria]
    if (!regolaKey) return null
    const valore = Number(struttura?.regole?.[regolaKey])
    return Number.isFinite(valore) && valore > 0 ? valore : null
  }, [struttura, getCategoriaPortata])

  const getSelezionatiCount = (portata: Portata) =>
    (portata.piatti || []).filter((p) => p.selezionato).length

  const togglePiatto = (portataId: string, piattoId: string) => {
    setMenu((prev) => {
      const portata = prev.portate.find((p) => p.id === portataId)
      if (!portata) return prev
      const limite = getLimitePortata(portata)
      const selectedCount = getSelezionatiCount(portata)
      const target = (portata.piatti || []).find((p) => p.id === piattoId)
      const toSelect = !target?.selezionato

      if (toSelect && limite && selectedCount >= limite) {
        setStatus(`⚠️ In ${portata.nome} puoi selezionare massimo ${limite} piatti`)
        setTimeout(() => setStatus(''), 2500)
        return prev
      }

      return {
        ...prev,
        portate: prev.portate.map((p) => {
          if (p.id !== portataId) return p
          return {
            ...p,
            piatti: (p.piatti || []).map((piatto) =>
              piatto.id === piattoId ? { ...piatto, selezionato: !piatto.selezionato } : piatto
            )
          }
        })
      }
    })
  }

  const aggiungiExtraPiatto = (portata: Portata) => {
    const value = (extraInputs[portata.id] || '').trim()
    if (!value) return
    const categoria = getCategoriaPortata(portata)

    setMenu((prev) => ({
      ...prev,
      portate: prev.portate.map((p) => {
        if (p.id !== portata.id) return p
        return {
          ...p,
          piatti: [
            ...(p.piatti || []),
            {
              id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              nome: value,
              descrizione: '',
              categoria,
              isExtra: true,
              selezionato: true,
              defaultSelected: false
            }
          ]
        }
      })
    }))

    setExtraInputs((prev) => ({ ...prev, [portata.id]: '' }))
  }

  const rimuoviExtraPiatto = (portataId: string, piattoId: string) => {
    setMenu((prev) => ({
      ...prev,
      portate: prev.portate.map((p) => {
        if (p.id !== portataId) return p
        return {
          ...p,
          piatti: (p.piatti || []).filter((piatto) => !(piatto.id === piattoId && piatto.isExtra))
        }
      })
    }))
  }

  const prepareMenuForSave = (menuValue: MenuEvento): MenuEvento => {
    return {
      ...menuValue,
      portate: menuValue.portate.map((portata) => {
        const selectedPiatti = (portata.piatti || []).filter((p) => p.selezionato)
        const descrizione = selectedPiatti
          .map((p) => `• ${p.nome}${p.descrizione ? ` — ${p.descrizione}` : ''}`)
          .join('\n')

        return {
          ...portata,
          descrizione,
          piatti: portata.piatti || []
        }
      })
    }
  }

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
          menu: prepareMenuForSave(menu)
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

  const toggleVariante = (variantId: VariantId) => {
    setMenu(prev => {
      const attive = prev.variantiAttive.includes(variantId)
        ? prev.variantiAttive.filter(v => v !== variantId)
        : [...prev.variantiAttive, variantId]
      return { ...prev, variantiAttive: attive }
    })
  }

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
          <CardHeader>
            <div>
              <CardTitle className="text-lg">Portate</CardTitle>
              <p className="text-sm text-gray-500">
                Seleziona i piatti del menu base. Le portate non vengono eliminate, scegli solo le pietanze.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {menu.portate.length === 0 ? (
              <div className="text-center py-8 text-gray-500 space-y-2" data-testid="empty-portate">
                <p>Nessuna portata disponibile nel menu base</p>
                <Button variant="outline" onClick={() => router.push(`/modifica-evento/${id}`)} data-testid="go-load-menu-base-btn">
                  Torna all'evento e carica un menu base
                </Button>
              </div>
            ) : (
              menu.portate
                .sort((a, b) => a.ordine - b.ordine)
                .map((portata, idx) => (
                  <PortataSelezioneCard
                    key={portata.id}
                    portata={portata}
                    index={idx}
                    limite={getLimitePortata(portata)}
                    selectedCount={getSelezionatiCount(portata)}
                    extraValue={extraInputs[portata.id] || ''}
                    onToggle={(piattoId) => togglePiatto(portata.id, piattoId)}
                    onExtraChange={(v) => setExtraInputs((prev) => ({ ...prev, [portata.id]: v }))}
                    onExtraAdd={() => aggiungiExtraPiatto(portata)}
                    onExtraRemove={(piattoId) => rimuoviExtraPiatto(portata.id, piattoId)}
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

interface PortataSelezioneCardProps {
  portata: Portata
  index: number
  limite: number | null
  selectedCount: number
  extraValue: string
  onToggle: (piattoId: string) => void
  onExtraChange: (value: string) => void
  onExtraAdd: () => void
  onExtraRemove: (piattoId: string) => void
}

function PortataSelezioneCard({
  portata,
  index,
  limite,
  selectedCount,
  extraValue,
  onToggle,
  onExtraChange,
  onExtraAdd,
  onExtraRemove
}: PortataSelezioneCardProps) {
  const piatti = (portata.piatti || [])

  return (
    <div 
      className="p-4 bg-white border rounded-lg shadow-sm"
      data-testid={`portata-card-${portata.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400">Portata {index + 1}</p>
          <h3 className="font-semibold text-gray-900 text-lg" data-testid={`portata-nome-${portata.id}`}>
            {portata.nome}
          </h3>
          <p className="text-xs text-gray-500" data-testid={`portata-counter-${portata.id}`}>
            Selezionati {selectedCount}
            {limite ? ` / ${limite}` : ''}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {piatti.map((piatto) => (
          <div key={piatto.id} className="flex items-center gap-3 border rounded-lg px-3 py-2" data-testid={`menu-piatto-row-${piatto.id}`}>
            <input
              type="checkbox"
              checked={Boolean(piatto.selezionato)}
              onChange={() => onToggle(piatto.id)}
              data-testid={`menu-piatto-check-${piatto.id}`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{piatto.nome}</p>
              {piatto.descrizione && <p className="text-xs text-gray-500">{piatto.descrizione}</p>}
            </div>
            {piatto.defaultSelected && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded" data-testid={`menu-piatto-default-${piatto.id}`}>
                default
              </span>
            )}
            {piatto.isExtra && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onExtraRemove(piatto.id)}
                className="text-red-500 hover:text-red-700"
                data-testid={`menu-piatto-remove-extra-${piatto.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-1" data-testid={`menu-extra-wrap-${portata.id}`}>
          <Input
            value={extraValue}
            onChange={(e) => onExtraChange(e.target.value)}
            placeholder="Aggiungi piatto extra (accordo cliente)"
            data-testid={`menu-extra-input-${portata.id}`}
          />
          <Button variant="outline" onClick={onExtraAdd} data-testid={`menu-extra-add-${portata.id}`}>
            <Plus className="w-4 h-4 mr-1" /> Extra
          </Button>
        </div>
      </div>
    </div>
  )
}
