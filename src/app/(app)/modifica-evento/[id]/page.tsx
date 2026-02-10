'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Edit,
  Save,
  ArrowLeft,
  Calendar,
  UtensilsCrossed,
  Layout,
  Printer,
  X,
  Plus,
  Users,
  MapPin,
  Euro
} from 'lucide-react'
import MenuBaseSelector from '@/components/MenuBaseSelector'
import MenuStampa from '@/components/stampe/MenuStampa'
import BannerBlocco, { getOverrideHeaders, clearOverrideHeaders } from '@/components/BannerBlocco'

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
  const [isSaving, setIsSaving] = useState(false)

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

  const aggiornaStruttura = (struttura: any) => {
    if (!evento) return
    setEvento({ ...evento, struttura })
  }

  const aggiornaMenu = (menu: Record<string, string[]>) => {
    if (!evento) return
    setEvento({ ...evento, menu })
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
    setIsSaving(true)
    setStatus('Salvataggio in corso...')

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
        disposizioneSala: evento.disposizioneSala || null,
        sposa: evento.sposa,
        sposo: evento.sposo,
        luogo: evento.luogo,
        prezzo: evento.prezzo ? parseFloat(evento.prezzo) : null,
        menuPasto: evento.menuPasto,
        menuBuffet: evento.menuBuffet
      })
    })

    if (res.status === 423) {
      const errorData = await res.json()
      setStatus(`🔒 ${errorData.message}`)
      setIsSaving(false)
      return
    }

    clearOverrideHeaders()
    setStatus(res.ok ? '✅ Modificato con successo' : '❌ Errore nel salvataggio')
    setIsSaving(false)
    setTimeout(() => setStatus(''), 3000)
  }

  const handleCreaVersione = async (tipo: string, tipoDoc: string): Promise<number> => {
    try {
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

  if (!evento) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="modifica-evento-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => router.push('/calendario')}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna al Calendario
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Edit className="w-7 h-7 text-amber-500" />
            Modifica Evento
          </h1>
          <p className="text-gray-500">{evento.titolo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => router.push(`/eventi/${id}/menu`)}
            variant="outline"
            data-testid="gestione-menu-btn"
          >
            <UtensilsCrossed className="w-4 h-4 mr-2" />
            Menu
          </Button>
          <Button
            onClick={() => router.push(`/piantina-evento/${id}`)}
            variant="outline"
          >
            <Layout className="w-4 h-4 mr-2" />
            Piantina
          </Button>
          <Button
            onClick={() => setShowStampa(true)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="stampa-documenti-btn"
          >
            <Printer className="w-4 h-4 mr-2" />
            Stampa
          </Button>
        </div>
      </div>

      {/* Banner Blocco */}
      {infoBlocco && (
        <BannerBlocco 
          infoBlocco={infoBlocco} 
          onOverrideSuccess={() => setStatus('🔓 Override attivato. Puoi salvare le modifiche.')}
        />
      )}

      {/* Status */}
      {status && (
        <div className={`px-4 py-2 rounded-lg text-sm ${
          status.includes('✅') ? 'bg-green-50 text-green-700' : 
          status.includes('❌') || status.includes('🔒') ? 'bg-red-50 text-red-700' : 
          'bg-blue-50 text-blue-700'
        }`}>
          {status}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Info Evento */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo *
                </label>
                <Input 
                  name="titolo" 
                  value={evento.titolo} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo Evento
                  </label>
                  <select 
                    name="tipo" 
                    value={evento.tipo} 
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Matrimonio">Matrimonio</option>
                    <option value="Compleanno">Compleanno</option>
                    <option value="Comunione">Comunione</option>
                    <option value="Battesimo">Battesimo</option>
                    <option value="Cresima">Cresima</option>
                    <option value="Festa Privata/Aziendale">Festa Privata/Aziendale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fascia Oraria
                  </label>
                  <select 
                    name="fascia" 
                    value={evento.fascia} 
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="pranzo">Pranzo</option>
                    <option value="cena">Cena</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stato
                  </label>
                  <select 
                    name="stato" 
                    value={evento.stato} 
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="in_attesa">🟡 In attesa</option>
                    <option value="confermato">🟢 Confermato</option>
                    <option value="annullato">🔴 Annullato</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Users className="w-4 h-4 inline mr-1" />
                    Numero Invitati
                  </label>
                  <Input 
                    name="personePreviste" 
                    type="number" 
                    value={evento.personePreviste ?? ''} 
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <Textarea 
                  name="note" 
                  value={evento.note || ''} 
                  onChange={handleChange} 
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date Evento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Proposte
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {Array.isArray(evento.dateProposte) && evento.dateProposte.map((d: string) => (
                    <span 
                      key={d} 
                      className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {new Date(d).toLocaleDateString('it-IT')}
                      <button 
                        type="button" 
                        onClick={() => rimuoviDataProposta(d)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={aggiungiDataProposta}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Data
                </Button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Confermata
                </label>
                <select
                  name="dataConfermata"
                  value={evento.dataConfermata || ''}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Nessuna --</option>
                  {Array.isArray(evento.dateProposte) && evento.dateProposte.map((d: string) => (
                    <option key={d} value={d}>{new Date(d).toLocaleDateString('it-IT')}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Dati Report */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Dati per Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sposa / Festeggiato
                  </label>
                  <Input 
                    name="sposa" 
                    value={evento.sposa || ''} 
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sposo (se matrimonio)
                  </label>
                  <Input 
                    name="sposo" 
                    value={evento.sposo || ''} 
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Luogo
                  </label>
                  <Input 
                    name="luogo" 
                    value={evento.luogo || ''} 
                    onChange={handleChange}
                    placeholder="Villa Paris"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Prezzo/persona (€)
                  </label>
                  <Input 
                    name="prezzo" 
                    type="number"
                    step="0.01"
                    value={evento.prezzo || ''} 
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Pasto
                  </label>
                  <Input 
                    name="menuPasto" 
                    value={evento.menuPasto || ''} 
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Buffet
                  </label>
                  <Input 
                    name="menuBuffet" 
                    value={evento.menuBuffet || ''} 
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Selection */}
          {evento.dataConfermata && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5" />
                  Selezione Menu
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!evento.struttura || Object.keys(evento.struttura).length === 0 ? (
                  <MenuBaseSelector
                    current={evento.menu}
                    onLoad={(struttura, selezione) => {
                      aggiornaStruttura(struttura)
                      aggiornaMenu(selezione)
                    }}
                  />
                ) : (
                  <p className="text-sm text-gray-500">
                    Menu configurato. Vai alla sezione "Menu" per gestire le portate.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </div>
      </form>

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
