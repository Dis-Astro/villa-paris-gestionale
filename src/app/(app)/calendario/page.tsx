'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Plus, ChevronLeft, Edit, Trash2, CalendarOff, Eye } from "lucide-react"
import Link from "next/link"

export default function CalendarioPage() {
  const router = useRouter()
  const [dataSelezionata, setDataSelezionata] = useState("")
  const [eventi, setEventi] = useState<any[]>([])
  const [eventiDelGiorno, setEventiDelGiorno] = useState<any[]>([])
  const [calendarKey, setCalendarKey] = useState(0)
  const [dateNascoste, setDateNascoste] = useState<string[]>([])

  useEffect(() => {
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
  }, [calendarKey])

  const handleDateClick = (arg: any) => {
    const data = arg.dateStr
    setDataSelezionata(data)
    setCalendarKey((prev) => prev + 1)
    filtraEventiPerData(data)
  }

  const filtraEventiPerData = (data: string) => {
    const eventiConfermati = eventi.filter((e) => e.dataConfermata === data)
    const eventiOpzionati = eventi.filter((e) => Array.isArray(e.dateProposte) && e.dateProposte.includes(data))
    const combinati = [...eventiConfermati, ...eventiOpzionati.filter(e => !eventiConfermati.includes(e))]
    setEventiDelGiorno(combinati)
  }

  const colorePerTipo = (tipo: string) => {
    switch (tipo) {
      case "Matrimonio": return "#10B981"
      case "Compleanno": return "#F59E0B"
      case "Comunione": return "#3B82F6"
      case "Festa Privata/Aziendale": return "#EF4444"
      default: return "#6B7280"
    }
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
      result.push({ title: evento.titolo, date: evento.dataConfermata, color: colore })
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

  return (
    <div className="space-y-6" data-testid="calendario-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-amber-500" />
            Calendario Eventi
          </h1>
          <p className="text-gray-500">Visualizza e gestisci tutti gli eventi</p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Eventi del giorno selezionato */}
      {dataSelezionata && (
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
            {eventiDelGiorno.length > 0 ? (
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
                          <p className="font-semibold text-gray-900">{e.titolo}</p>
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Nessun evento per questa data</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => router.push(`/nuovo-evento?data=${dataSelezionata}`)}
                >
                  Crea un nuovo evento
                </Button>
              </div>
            )}
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
            {[
              { tipo: "Matrimonio", colore: "#10B981" },
              { tipo: "Compleanno", colore: "#F59E0B" },
              { tipo: "Comunione", colore: "#3B82F6" },
              { tipo: "Festa Privata/Aziendale", colore: "#EF4444" },
              { tipo: "Altro", colore: "#6B7280" }
            ].map(item => (
              <div key={item.tipo} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.colore }}
                />
                <span className="text-sm text-gray-600">{item.tipo}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
