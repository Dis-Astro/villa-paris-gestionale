'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { buildMenuEventoFromStruttura, getPrezzoDaStruttura, normalizeStrutturaMenuBase } from "@/lib/menu-utils"
import { 
  Plus, Save, ArrowLeft, Calendar, Users, X, Phone, UtensilsCrossed, Euro
} from "lucide-react"

const tipiEvento = [
  "Matrimonio",
  "Compleanno 18 Anni",
  "Compleanno",
  "Comunione",
  "Festa Privata/Aziendale",
  "Anniversario",
  "Evento Culturale",
  "Battesimo"
]

const statiEvento = [
  { label: "In attesa", value: "in_attesa" },
  { label: "Confermato", value: "confermato" },
  { label: "Annullato", value: "annullato" }
]

const CANALI = [
  { value: 'telefono',        label: 'Telefono',        icon: '📞' },
  { value: 'email',           label: 'Mail',            icon: '📧' },
  { value: 'matrimonio.com',  label: 'Matrimonio.com',  icon: '💒' },
  { value: 'social',          label: 'Social',          icon: '📱' },
  { value: 'passaparola',     label: 'Passaparola',     icon: '🗣️' },
  { value: 'altro',           label: 'Altro',           icon: '•'  },
]

function NuovoEventoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dataIniziale = searchParams.get('data')
  const canaleIniziale = searchParams.get('canale') || ''
  const appuntamentoId = searchParams.get('appuntamentoId')
  
  // Primo contatto: Sposa / Festeggiato
  const [cliente1, setCliente1] = useState({
    nome: "", cognome: "", email: "", telefono: ""
  })

  // Secondo contatto: Sposo (opzionale)
  const [cliente2, setCliente2] = useState({
    nome: "", cognome: "", email: "", telefono: ""
  })
  const [showCliente2, setShowCliente2] = useState(false)

  const [canalePrimoContatto, setCanalePrimoContatto] = useState(canaleIniziale)
  
  const [evento, setEvento] = useState({
    tipo: "",
    titolo: "",
    dateProposte: [] as string[],
    dataConfermata: "",
    fascia: "pranzo",
    personePreviste: "",
    note: "",
    stato: "in_attesa",
    menu: {} as any,
    struttura: {} as any,
    menuPasto: "",
    prezzo: ""
  })

  const [menuBaseList, setMenuBaseList] = useState<any[]>([])
  const [menuBaseSelezionato, setMenuBaseSelezionato] = useState('')
  const [extraPietanze, setExtraPietanze] = useState('')
  const [sovrapprezzo, setSovrapprezzo] = useState('0')
  
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    if (dataIniziale && !evento.dateProposte.includes(dataIniziale)) {
      setEvento(prev => ({
        ...prev,
        dateProposte: [dataIniziale]
      }))
    }
  }, [dataIniziale])

  // Mostra automaticamente lo sposo se il tipo è matrimonio
  useEffect(() => {
    if (evento.tipo === 'Matrimonio' && !showCliente2) {
      setShowCliente2(true)
    }
  }, [evento.tipo])

  useEffect(() => {
    fetch('/api/menu-base')
      .then((res) => res.json())
      .then((data) => setMenuBaseList(Array.isArray(data) ? data : []))
      .catch(() => setMenuBaseList([]))
  }, [])

  useEffect(() => {
    const prefillFromAppointment = async () => {
      if (!appuntamentoId) return
      try {
        const res = await fetch(`/api/appuntamenti?id=${appuntamentoId}`)
        if (!res.ok) return
        const data = await res.json()

        const principale = data.clientePrincipale
        if (principale) {
          setCliente1({
            nome: principale.nome || '',
            cognome: principale.cognome || '',
            email: principale.email || '',
            telefono: principale.telefono || ''
          })
          setCanalePrimoContatto(principale.canalePrimoContatto || canaleIniziale)
        }

        const secondario = Array.isArray(data.clienti)
          ? data.clienti.map((c: any) => c.cliente).find((c: any) => c?.id && c.id !== principale?.id)
          : null
        if (secondario) {
          setShowCliente2(true)
          setCliente2({
            nome: secondario.nome || '',
            cognome: secondario.cognome || '',
            email: secondario.email || '',
            telefono: secondario.telefono || ''
          })
        }

        if (Array.isArray(data.dateOpzionate) && data.dateOpzionate.length) {
          setEvento((prev) => ({ ...prev, dateProposte: data.dateOpzionate }))
        }
      } catch {
        // ignore prefill errors
      }
    }

    prefillFromAppointment()
  }, [appuntamentoId, canaleIniziale])

  const menuSelezionato = menuBaseList.find((m) => String(m.id) === menuBaseSelezionato)
  const prezzoBaseMenu = menuSelezionato ? getPrezzoDaStruttura(menuSelezionato.struttura) : null
  const sovrapprezzoNum = Number.parseFloat(sovrapprezzo || '0') || 0
  const prezzoFinaleMenu = prezzoBaseMenu !== null ? Number((prezzoBaseMenu + sovrapprezzoNum).toFixed(2)) : null

  const handleSelezionaMenuBase = (id: string) => {
    setMenuBaseSelezionato(id)
    if (!id) {
      setEvento(prev => ({
        ...prev,
        struttura: {},
        menu: {},
        menuPasto: '',
        prezzo: ''
      }))
      return
    }

    const selezionato = menuBaseList.find((m) => String(m.id) === id)
    if (!selezionato) return

    const struttura = normalizeStrutturaMenuBase(selezionato.struttura)
    const menu = buildMenuEventoFromStruttura(struttura)
    const prezzoBase = getPrezzoDaStruttura(struttura)

    setEvento(prev => ({
      ...prev,
      struttura,
      menu,
      menuPasto: selezionato.nome,
      prezzo: prezzoBase !== null ? String(prezzoBase) : prev.prezzo
    }))
  }

  const toggleDataDaCalendario = (arg: any) => {
    const data = arg.dateStr
    const nuove = evento.dateProposte.includes(data)
      ? evento.dateProposte.filter(d => d !== data)
      : [...evento.dateProposte, data]
    setEvento({ ...evento, dateProposte: nuove })
  }

  const rimuoviData = (data: string) => {
    setEvento({
      ...evento,
      dateProposte: evento.dateProposte.filter(d => d !== data),
      dataConfermata: evento.dataConfermata === data ? "" : evento.dataConfermata
    })
  }

  const confermaEvento = async () => {
    if (!cliente1.nome.trim()) {
      alert("Inserisci almeno il nome del primo contatto (Sposa/Festeggiato).")
      return
    }
    if (!evento.titolo || !evento.tipo) {
      alert("Inserisci titolo e tipo evento.")
      return
    }
    
    setIsSaving(true)
    
    // Build the clients array
    const clienti = [{
      nome: cliente1.nome,
      cognome: cliente1.cognome,
      email: cliente1.email || `${cliente1.nome.toLowerCase().replace(/\s+/g, '.')}@villa-paris.local`,
      telefono: cliente1.telefono,
      tipoCliente: evento.tipo === 'Matrimonio' ? 'sposa' : 'festeggiato'
    }]

    if (showCliente2 && cliente2.nome.trim()) {
      clienti.push({
        nome: cliente2.nome,
        cognome: cliente2.cognome,
        email: cliente2.email || `${cliente2.nome.toLowerCase().replace(/\s+/g, '.')}@villa-paris.local`,
        telefono: cliente2.telefono,
        tipoCliente: 'sposo'
      })
    }

    const noteExtra = extraPietanze.trim()
      ? `\n\nExtra / accordi speciali:\n${extraPietanze.trim()}`
      : ''

    const menuPayload = evento.menu && typeof evento.menu === 'object'
      ? {
          ...evento.menu,
          note: `${evento.menu.note || ''}${noteExtra}`.trim()
        }
      : evento.menu

    const payload = {
      ...evento,
      clienti,
      menu: menuPayload,
      appuntamentoOrigineId: appuntamentoId ? Number(appuntamentoId) : null,
      canalePrimoContatto,
      prezzo: prezzoFinaleMenu ?? (evento.prezzo ? parseFloat(String(evento.prezzo)) : null),
      personePreviste: parseInt(evento.personePreviste || "0"),
      sposa: `${cliente1.nome} ${cliente1.cognome}`.trim(),
      sposo: showCliente2 && cliente2.nome.trim() ? `${cliente2.nome} ${cliente2.cognome}`.trim() : ''
    }
    
    try {
      const res = await fetch("/api/eventi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        router.push("/calendario")
      } else {
        const msg = await res.text()
        alert(`Errore: ${msg}`)
      }
    } catch (error) {
      console.error("Errore:", error)
      alert("Errore nel salvataggio")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="nuovo-evento-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => router.push('/calendario')} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna al Calendario
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Plus className="w-7 h-7 text-amber-500" />
            Nuovo Evento
          </h1>
        </div>
        <Button onClick={confermaEvento} disabled={isSaving} className="bg-amber-500 hover:bg-amber-600" data-testid="salva-evento-btn">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvataggio...' : 'Salva Evento'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Canale Contatto */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="w-5 h-5 text-violet-500" />
              Come ci ha contattato?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CANALI.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCanalePrimoContatto(canalePrimoContatto === c.value ? '' : c.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                    canalePrimoContatto === c.value
                      ? 'border-violet-500 bg-violet-500 text-white shadow-sm scale-105'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50'
                  }`}
                  data-testid={`canale-evento-btn-${c.value}`}
                >
                  <span>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sposa / Festeggiato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {evento.tipo === 'Matrimonio' ? 'Sposa / Festeggiata' : 'Festeggiato/a (1 contatto)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <Input value={cliente1.nome} onChange={e => setCliente1({...cliente1, nome: e.target.value})} data-testid="cliente1-nome" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                <Input value={cliente1.cognome} onChange={e => setCliente1({...cliente1, cognome: e.target.value})} data-testid="cliente1-cognome" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" value={cliente1.email} onChange={e => setCliente1({...cliente1, email: e.target.value})} data-testid="cliente1-email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <Input value={cliente1.telefono} onChange={e => setCliente1({...cliente1, telefono: e.target.value})} data-testid="cliente1-telefono" />
            </div>
          </CardContent>
        </Card>

        {/* Sposo (opzionale / auto-mostrato per matrimonio) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {evento.tipo === 'Matrimonio' ? 'Sposo' : '2 Contatto (opzionale)'}
              </CardTitle>
              {evento.tipo !== 'Matrimonio' && (
                <Button variant="ghost" size="sm" onClick={() => setShowCliente2(!showCliente2)}>
                  {showCliente2 ? 'Nascondi' : 'Aggiungi'}
                </Button>
              )}
            </div>
          </CardHeader>
          {showCliente2 && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <Input value={cliente2.nome} onChange={e => setCliente2({...cliente2, nome: e.target.value})} data-testid="cliente2-nome" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                  <Input value={cliente2.cognome} onChange={e => setCliente2({...cliente2, cognome: e.target.value})} data-testid="cliente2-cognome" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input type="email" value={cliente2.email} onChange={e => setCliente2({...cliente2, email: e.target.value})} data-testid="cliente2-email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <Input value={cliente2.telefono} onChange={e => setCliente2({...cliente2, telefono: e.target.value})} data-testid="cliente2-telefono" />
              </div>
            </CardContent>
          )}
          {!showCliente2 && evento.tipo !== 'Matrimonio' && (
            <CardContent>
              <p className="text-sm text-gray-400">Clicca "Aggiungi" per inserire un secondo contatto</p>
            </CardContent>
          )}
        </Card>

        {/* Dati Evento */}
        <Card>
          <CardHeader>
            <CardTitle>Dati Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Evento *</label>
              <Input 
                value={evento.titolo} 
                onChange={(e) => setEvento({...evento, titolo: e.target.value})}
                placeholder="Es. Matrimonio Rossi-Bianchi"
                data-testid="evento-titolo"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Evento *</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" 
                  value={evento.tipo} 
                  onChange={(e) => setEvento({...evento, tipo: e.target.value})}
                  data-testid="evento-tipo"
                >
                  <option value="">-- Seleziona --</option>
                  {tipiEvento.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fascia Oraria</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" 
                  value={evento.fascia} 
                  onChange={(e) => setEvento({...evento, fascia: e.target.value})}
                >
                  <option value="pranzo">Pranzo</option>
                  <option value="cena">Cena</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numero Invitati</label>
                <Input 
                  type="number" 
                  value={evento.personePreviste} 
                  onChange={(e) => setEvento({...evento, personePreviste: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" 
                  value={evento.stato} 
                  onChange={(e) => setEvento({...evento, stato: e.target.value})}
                >
                  {statiEvento.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <Textarea 
                value={evento.note} 
                onChange={(e) => setEvento({...evento, note: e.target.value})}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Menu Evento (easy flow) */}
        <Card className="lg:col-span-2" data-testid="nuovo-evento-menu-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-500" />
              Menu Evento (Easy)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Base</label>
                <select
                  value={menuBaseSelezionato}
                  onChange={(e) => handleSelezionaMenuBase(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  data-testid="nuovo-evento-menu-base-select"
                >
                  <option value="">-- Nessun menu base --</option>
                  {menuBaseList.map((m) => {
                    const prezzo = getPrezzoDaStruttura(m.struttura)
                    return (
                      <option key={m.id} value={String(m.id)}>
                        {m.nome}{prezzo !== null ? ` — €${prezzo}/persona` : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sovrapprezzo per persona (€)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={sovrapprezzo}
                  onChange={(e) => setSovrapprezzo(e.target.value)}
                  data-testid="nuovo-evento-sovrapprezzo-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="nuovo-evento-prezzo-menu-info">
                <p className="text-sm text-amber-900 font-medium flex items-center gap-2">
                  <Euro className="w-4 h-4" /> Prezzo menu per persona
                </p>
                <p className="text-lg font-bold text-amber-700 mt-1">
                  {prezzoFinaleMenu !== null ? `€ ${prezzoFinaleMenu.toFixed(2)}` : 'Non definito nel menu base'}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Base: {prezzoBaseMenu !== null ? `€ ${prezzoBaseMenu.toFixed(2)}` : '—'} · Sovrapprezzo: € {sovrapprezzoNum.toFixed(2)}
                </p>
              </div>

              <div className="bg-gray-50 border rounded-lg p-3" data-testid="nuovo-evento-menu-customization-hint">
                <p className="text-sm font-medium text-gray-800">Personalizzazione evento</p>
                <p className="text-xs text-gray-600 mt-1">
                  Il template resta invariato: dopo il salvataggio puoi rifinire il menu evento con piatti aggiuntivi.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra / accordi speciali (piatti fuori menu, sovrapprezzi, eccezioni)
              </label>
              <Textarea
                value={extraPietanze}
                onChange={(e) => setExtraPietanze(e.target.value)}
                rows={3}
                placeholder="Es: Aggiungere risotto ai funghi per tavolo sposi (+€3/persona), buffet dolci premium..."
                data-testid="nuovo-evento-menu-extra-textarea"
              />
            </div>
          </CardContent>
        </Card>

        {/* Date */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Selezione Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Proposte (clicca sul calendario)
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {evento.dateProposte.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">
                    {new Date(d).toLocaleDateString('it-IT')}
                    <button type="button" onClick={() => rimuoviData(d)} className="text-amber-600 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {evento.dateProposte.length === 0 && (
                  <span className="text-sm text-gray-500">Nessuna data selezionata.</span>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="it"
                  dateClick={toggleDataDaCalendario}
                  height="auto"
                  events={evento.dateProposte.map(d => ({ date: d, title: "Data proposta", color: '#F59E0B' }))}
                  headerToolbar={{ left: 'prev,next', center: 'title', right: 'today' }}
                  buttonText={{ today: 'Oggi' }}
                />
              </div>
            </div>

            {evento.dateProposte.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Confermata</label>
                <select 
                  className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" 
                  value={evento.dataConfermata} 
                  onChange={(e) => setEvento({...evento, dataConfermata: e.target.value})}
                >
                  <option value="">-- Nessuna (opzionata) --</option>
                  {evento.dateProposte.map(d => (
                    <option key={d} value={d}>{new Date(d).toLocaleDateString('it-IT')}</option>
                  ))}
                </select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NuovoEventoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    }>
      <NuovoEventoContent />
    </Suspense>
  )
}
