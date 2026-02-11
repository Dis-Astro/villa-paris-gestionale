'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  CalendarOff, 
  UserPlus,
  X,
  Phone,
  Mail,
  Clock,
  Users
} from "lucide-react"

// Tipi evento incluso Appuntamento
const TIPI_EVENTO = [
  { tipo: "Appuntamento", colore: "#8B5CF6" },  // Viola
  { tipo: "Matrimonio", colore: "#10B981" },
  { tipo: "Compleanno", colore: "#F59E0B" },
  { tipo: "Comunione", colore: "#3B82F6" },
  { tipo: "Battesimo", colore: "#EC4899" },
  { tipo: "Festa Privata/Aziendale", colore: "#EF4444" },
  { tipo: "Altro", colore: "#6B7280" }
]

export default function CalendarioPage() {
  const router = useRouter()
  const [dataSelezionata, setDataSelezionata] = useState("")
  const [eventi, setEventi] = useState<any[]>([])
  const [eventiDelGiorno, setEventiDelGiorno] = useState<any[]>([])
  const [calendarKey, setCalendarKey] = useState(0)
  const [dateNascoste, setDateNascoste] = useState<string[]>([])
  
  // Modal appuntamento rapido
  const [showAppuntamento, setShowAppuntamento] = useState(false)
  const [appuntamento, setAppuntamento] = useState({
    nome: '',
    telefono: '',
    email: '',
    ora: '10:00',
    note: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  // Statistiche appuntamenti
  const appuntamentiAnno = eventi.filter(e => e.tipo === 'Appuntamento').length
  const appuntamentiMese = eventi.filter(e => {
    if (e.tipo !== 'Appuntamento') return false
    const data = e.dataConfermata || e.dateProposte?.[0]
    if (!data) return false
    const d = new Date(data)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const fetchEventi = () => {
    fetch("/api/eventi")
      .then((res) => res.json())
      .then((data) => {
        const parsed = data.map((evento: any) => {
          if (!Array.isArray(evento.dateProposte)) {
            evento.dateProposte = []
          }
          return {
            ...evento,
            dataConfermata: evento.dataConfermata?.split("T")[0] || null,
          }
        })
        setEventi(parsed)
      })
  }

  useEffect(() => {
    fetchEventi()
  }, [calendarKey])

  const handleDateClick = (arg: any) => {
    const data = arg.dateStr
    setDataSelezionata(data)
    filtraEventiPerData(data)
    // Mostra modal appuntamento rapido
    setShowAppuntamento(true)
    setAppuntamento({ nome: '', telefono: '', email: '', ora: '10:00', note: '' })
    setStatus('')
  }

  const filtraEventiPerData = (data: string) => {
    const eventiConfermati = eventi.filter((e) => e.dataConfermata === data)
    const eventiOpzionati = eventi.filter((e) => Array.isArray(e.dateProposte) && e.dateProposte.includes(data))
    const combinati = [...eventiConfermati, ...eventiOpzionati.filter(e => !eventiConfermati.includes(e))]
    setEventiDelGiorno(combinati)
  }

  const colorePerTipo = (tipo: string) => {
    const found = TIPI_EVENTO.find(t => t.tipo === tipo)
    return found?.colore || "#6B7280"
  }

  const statoLabel = (stato: string) => {
    switch (stato) {
      case "confermato": return { text: "Confermato", color: "bg-green-100 text-green-700" }
      case "annullato": return { text: "Annullato", color: "bg-red-100 text-red-700" }
      default: return { text: "In attesa", color: "bg-amber-100 text-amber-700" }
    }
  }

  const eventiCalendario = eventi.flatMap((evento) => {
    if (evento.stato === 'annullato') return []
    const colore = colorePerTipo(evento.tipo)
    const result: any[] = []
    if (evento.dataConfermata && !dateNascoste.includes(evento.dataConfermata)) {
      result.push({ 
        title: evento.tipo === 'Appuntamento' ? `📞 ${evento.titolo}` : evento.titolo, 
        date: evento.dataConfermata, 
        color: colore 
      })
    }
    if (Array.isArray(evento.dateProposte)) {
      result.push(...evento.dateProposte.filter((d: string) => !dateNascoste.includes(d)).map((d: string) => ({
        title: evento.titolo,
        date: d,
        color: colore,
        className: 'opacity-60'
      })))
    }
    return result
  })

  const annullaEvento = async (id: number) => {
    if (!confirm('Sei sicuro di voler annullare questo evento?')) return
    await fetch(`/api/eventi?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'annullato' })
    })
    setCalendarKey(prev => prev + 1)
  }

  // Salva appuntamento rapido
  const salvaAppuntamento = async () => {
    if (!appuntamento.nome.trim()) {
      setStatus('❌ Inserisci il nome del cliente')
      return
    }

    setIsSaving(true)
    setStatus('Salvataggio...')

    try {
      const res = await fetch('/api/eventi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'Appuntamento',
          titolo: `Appuntamento - ${appuntamento.nome}`,
          dateProposte: [dataSelezionata],
          dataConfermata: dataSelezionata,
          fascia: 'pranzo',
          stato: 'confermato',
          note: `Ora: ${appuntamento.ora}\nTelefono: ${appuntamento.telefono}\n${appuntamento.note}`,
          clienti: [{
            nome: appuntamento.nome,
            email: appuntamento.email || `${appuntamento.nome.toLowerCase().replace(/\s+/g, '.')}@appuntamento.local`,
            telefono: appuntamento.telefono
          }]
        })
      })

      if (res.ok) {
        setStatus('✅ Appuntamento salvato!')
        setTimeout(() => {
          setShowAppuntamento(false)
          setCalendarKey(prev => prev + 1)
        }, 1000)
      } else {
        const err = await res.text()
        setStatus(`❌ Errore: ${err}`)
      }
    } catch (error) {
      setStatus('❌ Errore di connessione')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="calendario-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-amber-500" />
            Calendario Eventi
          </h1>
          <p className="text-gray-500">Clicca su una data per creare un appuntamento</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Statistiche Appuntamenti */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full">
              <Phone className="w-4 h-4 text-purple-600" />
              <span className="text-purple-700 font-medium">{appuntamentiMese} questo mese</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700 font-medium">{appuntamentiAnno} anno</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Vai a:</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              value={dataSelezionata}
              onChange={(e) => {
                const nuovaData = e.target.value
                setDataSelezionata(nuovaData)
                setCalendarKey((prev) => prev + 1)
                filtraEventiPerData(nuovaData)
              }}
            />
          </div>
          <Button 
            onClick={() => router.push('/nuovo-evento')}
            className="bg-amber-500 hover:bg-amber-600"
            data-testid="nuovo-evento-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Evento
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <Card>
        <CardContent className="p-4">
          <FullCalendar
            key={calendarKey}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={dataSelezionata || undefined}
            dateClick={handleDateClick}
            locale="it"
            height="auto"
            events={eventiCalendario}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek'
            }}
            buttonText={{
              today: 'Oggi',
              month: 'Mese',
              week: 'Settimana'
            }}
          />
        </CardContent>
      </Card>

      {/* Modal Appuntamento Rapido */}
      {showAppuntamento && dataSelezionata && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md" data-testid="modal-appuntamento">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-500" />
                Nuovo Appuntamento
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowAppuntamento(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <p className="text-purple-700 font-medium">
                  {new Date(dataSelezionata).toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Cliente *
                </label>
                <Input
                  value={appuntamento.nome}
                  onChange={(e) => setAppuntamento({...appuntamento, nome: e.target.value})}
                  placeholder="Mario Rossi"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Telefono
                  </label>
                  <Input
                    value={appuntamento.telefono}
                    onChange={(e) => setAppuntamento({...appuntamento, telefono: e.target.value})}
                    placeholder="333 1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Ora
                  </label>
                  <Input
                    type="time"
                    value={appuntamento.ora}
                    onChange={(e) => setAppuntamento({...appuntamento, ora: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email (opzionale)
                </label>
                <Input
                  type="email"
                  value={appuntamento.email}
                  onChange={(e) => setAppuntamento({...appuntamento, email: e.target.value})}
                  placeholder="mario@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <Input
                  value={appuntamento.note}
                  onChange={(e) => setAppuntamento({...appuntamento, note: e.target.value})}
                  placeholder="Motivo appuntamento, preferenze..."
                />
              </div>

              {status && (
                <div className={`px-4 py-2 rounded-lg text-sm ${
                  status.includes('✅') ? 'bg-green-100 text-green-700' : 
                  status.includes('❌') ? 'bg-red-100 text-red-700' : 
                  'bg-blue-100 text-blue-700'
                }`}>
                  {status}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAppuntamento(false)}
                >
                  Annulla
                </Button>
                <Button
                  onClick={salvaAppuntamento}
                  disabled={isSaving}
                  className="flex-1 bg-purple-500 hover:bg-purple-600"
                >
                  {isSaving ? 'Salvataggio...' : 'Conferma Appuntamento'}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => {
                    setShowAppuntamento(false)
                    router.push(`/nuovo-evento?data=${dataSelezionata}`)
                  }}
                >
                  Oppure crea un evento completo →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Eventi del giorno selezionato */}
      {dataSelezionata && eventiDelGiorno.length > 0 && (
        <Card data-testid="eventi-giorno">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Eventi del {new Date(dataSelezionata).toLocaleDateString('it-IT', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                year: 'numeric'
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventiDelGiorno.map((e) => {
                const statoInfo = statoLabel(e.stato)
                return (
                  <div 
                    key={e.id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: colorePerTipo(e.tipo) }}
                      />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {e.tipo === 'Appuntamento' && '📞 '}
                          {e.titolo}
                        </p>
                        <p className="text-sm text-gray-500">{e.tipo}</p>
                        {e.clienti?.[0]?.cliente && (
                          <p className="text-sm text-gray-500">
                            Cliente: {e.clienti[0].cliente.nome}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statoInfo.color}`}>
                        {statoInfo.text}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/modifica-evento/${e.id}`)}
                          data-testid={`modifica-evento-${e.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDateNascoste(prev => [...prev, dataSelezionata])}
                        >
                          <CalendarOff className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => annullaEvento(e.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda Tipi Evento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {TIPI_EVENTO.map(item => (
              <div key={item.tipo} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.colore }}
                />
                <span className="text-sm text-gray-600">
                  {item.tipo === 'Appuntamento' && '📞 '}
                  {item.tipo}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
