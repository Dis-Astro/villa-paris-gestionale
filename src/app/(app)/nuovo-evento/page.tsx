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
import { 
  Plus, 
  Save, 
  ArrowLeft, 
  Calendar, 
  Users, 
  X
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

function NuovoEventoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dataIniziale = searchParams.get('data')
  
  const [cliente, setCliente] = useState({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    indirizzo: ""
  })
  
  const [evento, setEvento] = useState({
    tipo: "",
    titolo: "",
    dateProposte: [] as string[],
    dataConfermata: "",
    fascia: "pranzo",
    personePreviste: "",
    note: "",
    stato: "in_attesa"
  })
  
  const [isSaving, setIsSaving] = useState(false)
  
  // Imposta data iniziale se presente
  useEffect(() => {
    if (dataIniziale && !evento.dateProposte.includes(dataIniziale)) {
      setEvento(prev => ({
        ...prev,
        dateProposte: [dataIniziale]
      }))
    }
  }, [dataIniziale])

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
    if (!cliente.email || !cliente.nome) {
      alert("⚠️ Inserisci almeno nome ed email del cliente.")
      return
    }
    if (!evento.titolo || !evento.tipo) {
      alert("⚠️ Inserisci titolo e tipo evento.")
      return
    }
    
    setIsSaving(true)
    
    const payload = {
      ...evento,
      clienti: [{
        nome: cliente.nome,
        cognome: cliente.cognome,
        email: cliente.email,
        telefono: cliente.telefono,
        indirizzo: cliente.indirizzo
      }],
      personePreviste: parseInt(evento.personePreviste || "0")
    }
    
    try {
      const res = await fetch("/api/eventi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      
      if (res.ok) {
        alert("✅ Evento salvato!")
        router.push("/calendario")
      } else {
        alert("❌ Errore nel salvataggio")
      }
    } catch (error) {
      console.error("Errore:", error)
      alert("❌ Errore nel salvataggio")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="nuovo-evento-page">
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
            <Plus className="w-7 h-7 text-amber-500" />
            Nuovo Evento
          </h1>
        </div>
        <Button 
          onClick={confermaEvento}
          disabled={isSaving}
          className="bg-amber-500 hover:bg-amber-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Salvataggio...' : 'Salva Evento'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Dati Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <Input 
                  value={cliente.nome} 
                  onChange={(e) => setCliente({...cliente, nome: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cognome
                </label>
                <Input 
                  value={cliente.cognome} 
                  onChange={(e) => setCliente({...cliente, cognome: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <Input 
                type="email"
                value={cliente.email} 
                onChange={(e) => setCliente({...cliente, email: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefono
              </label>
              <Input 
                value={cliente.telefono} 
                onChange={(e) => setCliente({...cliente, telefono: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indirizzo
              </label>
              <Input 
                value={cliente.indirizzo} 
                onChange={(e) => setCliente({...cliente, indirizzo: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dati Evento */}
        <Card>
          <CardHeader>
            <CardTitle>Dati Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titolo Evento *
              </label>
              <Input 
                value={evento.titolo} 
                onChange={(e) => setEvento({...evento, titolo: e.target.value})}
                placeholder="Es. Matrimonio Rossi-Bianchi"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Evento *
                </label>
                <select 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" 
                  value={evento.tipo} 
                  onChange={(e) => setEvento({...evento, tipo: e.target.value})}
                >
                  <option value="">-- Seleziona --</option>
                  {tipiEvento.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fascia Oraria
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Invitati
                </label>
                <Input 
                  type="number" 
                  value={evento.personePreviste} 
                  onChange={(e) => setEvento({...evento, personePreviste: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato
                </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <Textarea 
                value={evento.note} 
                onChange={(e) => setEvento({...evento, note: e.target.value})}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Selezione Date
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date proposte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Proposte (clicca sul calendario)
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {evento.dateProposte.map((d) => (
                  <span 
                    key={d}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
                  >
                    {new Date(d).toLocaleDateString('it-IT')}
                    <button 
                      type="button"
                      onClick={() => rimuoviData(d)}
                      className="text-amber-600 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {evento.dateProposte.length === 0 && (
                  <span className="text-sm text-gray-500">
                    Nessuna data selezionata. Clicca sul calendario per aggiungere.
                  </span>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale="it"
                  dateClick={toggleDataDaCalendario}
                  height="auto"
                  events={evento.dateProposte.map(d => ({ 
                    date: d, 
                    title: "Data proposta",
                    color: '#F59E0B'
                  }))}
                  headerToolbar={{
                    left: 'prev,next',
                    center: 'title',
                    right: 'today'
                  }}
                  buttonText={{
                    today: 'Oggi'
                  }}
                />
              </div>
            </div>

            {/* Data confermata */}
            {evento.dateProposte.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Confermata
                </label>
                <select 
                  className="w-full max-w-xs border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500" 
                  value={evento.dataConfermata} 
                  onChange={(e) => setEvento({...evento, dataConfermata: e.target.value})}
                >
                  <option value="">-- Nessuna (opzionata) --</option>
                  {evento.dateProposte.map(d => (
                    <option key={d} value={d}>
                      {new Date(d).toLocaleDateString('it-IT')}
                    </option>
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
