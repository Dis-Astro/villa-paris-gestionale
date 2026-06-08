'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Calendar, Plus, Edit, Trash2, UserPlus,
  X, Phone, Mail, Clock, Users, ChevronLeft, ChevronRight
} from "lucide-react"

// ──────────────────────────────────────────────────
// SCHEMA COLORI
// ──────────────────────────────────────────────────
const COLORI: Record<string, { bg: string; label: string }> = {
  registrazione:  { bg: '#92400E', label: 'Registrazione 1° contatto' },
  opzionato:      { bg: '#F59E0B', label: 'Data opzionata'            },
  confermato:     { bg: '#10B981', label: 'Confermato'                },
  appuntamento:   { bg: '#8B5CF6', label: 'Appuntamento'              },
  matrimonio:     { bg: '#3B82F6', label: 'Matrimonio'                },
  battesimo:      { bg: '#EC4899', label: 'Battesimo'                 },
  compleanno:     { bg: '#F97316', label: 'Compleanno'                },
  comunione:      { bg: '#06B6D4', label: 'Comunione'                 },
  cresima:        { bg: '#6366F1', label: 'Cresima'                   },
  aziendale:      { bg: '#64748B', label: 'Aziendale'                 },
  altro:          { bg: '#6B7280', label: 'Altro'                     },
}

function colorePerTipo(tipo: string, ruolo: string): string {
  if (ruolo === 'registrazione' || ruolo === 'registrazione-cliente') return COLORI.registrazione.bg
  if (ruolo === 'opzionato')     return COLORI.opzionato.bg
  if (ruolo === 'appuntamento')  return COLORI.appuntamento.bg
  const t = tipo.toLowerCase()
  if (t.includes('matrimon'))  return COLORI.matrimonio.bg
  if (t.includes('battesim'))  return COLORI.battesimo.bg
  if (t.includes('complea'))   return COLORI.compleanno.bg
  if (t.includes('comuni'))    return COLORI.comunione.bg
  if (t.includes('cresim'))    return COLORI.cresima.bg
  if (t.includes('aziendale')) return COLORI.aziendale.bg
  return COLORI.confermato.bg
}

// ──────────────────────────────────────────────────
// TOOLTIP COMPONENT
// ──────────────────────────────────────────────────
interface TooltipInfo {
  evento: any
  x: number
  y: number
  ruolo: string
}

function EventTooltip({ info, onClose }: { info: TooltipInfo; onClose: () => void }) {
  const { evento, x, y, ruolo } = info
  const cp = evento.clienti?.[0]?.cliente || evento.clientePrincipale
  const col = colorePerTipo(evento.tipo, ruolo)

  // Posizionamento adattivo: non uscire dalla viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left:  Math.min(x + 12, window.innerWidth - 280),
    top:   y + 12 > window.innerHeight - 180 ? y - 170 : y + 12,
    zIndex: 9999,
    minWidth: 240,
    pointerEvents: 'none',
  }

  return (
    <div style={style} className="bg-white border border-gray-200 rounded-xl shadow-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: col }} />
        <span className="font-semibold text-sm text-gray-900 truncate">{evento.titolo}</span>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        {ruolo !== 'registrazione' && ruolo !== 'registrazione-cliente' && (
          <p><span className="font-medium">Tipo:</span> {evento.tipo}</p>
        )}
        {(ruolo === 'registrazione' || ruolo === 'registrazione-cliente') && (
          <p className="text-amber-700 font-medium">📋 Registrazione 1° contatto</p>
        )}
        {evento.canalePrimoContatto && (ruolo === 'registrazione' || ruolo === 'registrazione-cliente') && (
          <p><span className="font-medium">Provenienza:</span> {evento.canalePrimoContatto}</p>
        )}
        {ruolo === 'opzionato' && (
          <p className="text-amber-600 font-medium">⏳ Data opzionata</p>
        )}
        {evento.dataConfermata && ruolo !== 'opzionato' && ruolo !== 'registrazione' && (
          <p><span className="font-medium">Data:</span> {new Date(evento.dataConfermata + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        )}
        {evento.personePreviste > 0 && (
          <p><span className="font-medium">Ospiti:</span> {evento.personePreviste}</p>
        )}
        {cp && (
          <p><span className="font-medium">Referente:</span> {cp.nome} {cp.cognome || ''}</p>
        )}
        {cp?.telefono && (
          <p><span className="font-medium">Tel:</span> {cp.telefono}</p>
        )}
        {evento.stato && (
          <p><span className="font-medium">Stato:</span> {evento.stato.replace('_', ' ')}</p>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2 border-t pt-1">{ruolo === 'registrazione-cliente' ? 'Doppio click per aprire anagrafica clienti' : 'Doppio click per aprire scheda completa'}</p>
    </div>
  )
}

// ──────────────────────────────────────────────────
// PAGINA PRINCIPALE
// ──────────────────────────────────────────────────
export default function CalendarioPage() {
  const router = useRouter()
  const calendarRef = useRef<any>(null)
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [role, setRole] = useState<'ADMIN' | 'REPORT' | 'WORKER' | null>(null)
  const [dataSelezionata, setDataSelezionata] = useState(todayIso)
  const [ricercaEvento, setRicercaEvento] = useState('')
  const [filtroVista, setFiltroVista] = useState('tutti')
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [eventi, setEventi] = useState<any[]>([])
  const [appuntamenti, setAppuntamenti] = useState<any[]>([])
  const [primiContatti, setPrimiContatti] = useState<any[]>([])
  const [eventiDelGiorno, setEventiDelGiorno] = useState<any[]>([])
  const [calendarKey, setCalendarKey] = useState(0)

  // Tooltip hover
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  // Track doppio-click
  const lastClickRef = useRef<{ id: number; time: number } | null>(null)

  // Modal appuntamento rapido
  const [showAppuntamento, setShowAppuntamento] = useState(false)
  const [appuntamento, setAppuntamento] = useState({ nome: '', telefono: '', email: '', ora: '10:00', note: '', canale: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState('')

  const appuntamentiMese = appuntamenti.filter((a: any) => {
    const d = a.dataAppuntamento?.split('T')[0]
    if (!d) return false
    const dt = new Date(d); const now = new Date()
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
  }).length

  const canManageCalendar = role !== null && role !== 'REPORT'

  useEffect(() => {
    const loadMe = async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return
      const data = await res.json()
      setRole(data.role)
    }
    loadMe()
  }, [])

  const eventiPerData = useCallback((data: string) => {
    const daEventi = eventi.filter(e =>
      e.dataConfermata === data ||
      e.dataPrimoContatto === data ||
      (Array.isArray(e.dateProposte) && e.dateProposte.includes(data))
    )

    const daPrimiContatti = primiContatti.filter((cliente: any) => cliente.dataPrimoContatto === data)

    const daAppuntamenti = appuntamenti
      .filter((a: any) => a.dataAppuntamento?.split('T')[0] === data)
      .map((a: any) => ({
        ...a,
        tipo: 'Appuntamento',
        titolo: a.riassuntoColloquio || `Appuntamento - ${a.clientePrincipale?.nome || ''}`,
        dataConfermata: a.dataAppuntamento?.split('T')[0],
        _isAppointment: true
      }))

    return [...daEventi, ...daPrimiContatti, ...daAppuntamenti]
  }, [eventi, primiContatti, appuntamenti])

  const fetchEventi = useCallback(() => {
    Promise.all([
      fetch('/api/eventi').then(r => r.json()),
      fetch('/api/appuntamenti').then(r => r.json()).catch(() => []),
      fetch('/api/clienti').then(r => r.json()).catch(() => [])
    ])
      .then(([eventiData, appuntamentiData, clientiData]) => {
        const parsedEventi = (Array.isArray(eventiData) ? eventiData : []).map((ev: any) => ({
          ...ev,
          dataConfermata: ev.dataConfermata?.split('T')[0] || null,
          dataPrimoContatto: ev.dataPrimoContatto?.split('T')[0] || null,
          dateProposte: Array.isArray(ev.dateProposte)
            ? ev.dateProposte
            : (typeof ev.dateProposte === 'string' ? JSON.parse(ev.dateProposte || '[]') : [])
        }))
        const registrazioniEvento = new Set(
          parsedEventi.flatMap((ev: any) => (
            ev.dataPrimoContatto
              ? (Array.isArray(ev.clienti) ? ev.clienti.map((entry: any) => `${entry.cliente?.id || entry.clienteId}-${ev.dataPrimoContatto}`) : [])
              : []
          ))
        )

        const parsedPrimiContatti = (Array.isArray(clientiData) ? clientiData : [])
          .map((cliente: any) => ({
            ...cliente,
            tipo: 'Primo contatto',
            titolo: [cliente.nome, cliente.cognome].filter(Boolean).join(' ').trim() || 'Primo contatto',
            dataPrimoContatto: cliente.dataPrimoContatto?.split('T')[0] || null,
            clientePrincipale: cliente,
            _isFirstContact: true,
            stato: cliente.isSpam ? 'spam' : 'registrato'
          }))
          .filter((cliente: any) => cliente.dataPrimoContatto)
          .filter((cliente: any) => !registrazioniEvento.has(`${cliente.id}-${cliente.dataPrimoContatto}`))

        setEventi(parsedEventi)
        setAppuntamenti(Array.isArray(appuntamentiData) ? appuntamentiData : [])
        setPrimiContatti(parsedPrimiContatti)
      })
      .catch(() => {
        setEventi([])
        setAppuntamenti([])
        setPrimiContatti([])
      })
  }, [])

  useEffect(() => { fetchEventi() }, [fetchEventi, calendarKey])

  const goToDate = useCallback((val: string) => {
    if (!val) return
    setDataSelezionata(val)
    const y = new Date(val).getFullYear()
    setCurrentYear(y)
    const cal = calendarRef.current?.getApi()
    if (cal) cal.gotoDate(val)

    setEventiDelGiorno(eventiPerData(val))
    setShowAppuntamento(false)
  }, [eventiPerData])

  const prossimoEvento = useMemo(() => {
    const now = new Date(`${todayIso}T00:00:00`).getTime()
    const candidatiEventi = eventi
      .filter((ev) => ev.stato !== 'annullato')
      .map((ev) => {
        const data = ev.dataConfermata || ev.dataPrimoContatto || ev.dateProposte?.[0]
        if (!data) return null
        return {
          id: ev.id,
          titolo: ev.titolo,
          data,
          diff: new Date(`${data}T00:00:00`).getTime() - now
        }
      })

    const candidatiAppuntamenti = appuntamenti
      .map((a: any) => {
        const data = a.dataAppuntamento?.split('T')[0]
        if (!data) return null
        return {
          id: a.id,
          titolo: a.riassuntoColloquio || `Appuntamento - ${a.clientePrincipale?.nome || ''}`,
          data,
          diff: new Date(`${data}T00:00:00`).getTime() - now
        }
      })

    const candidati = [...candidatiEventi, ...candidatiAppuntamenti]
      .filter((x): x is { id: number; titolo: string; data: string; diff: number } => Boolean(x))
      .filter(x => x.diff >= 0)
      .sort((a, b) => a.diff - b.diff)

    return candidati[0] || null
  }, [eventi, appuntamenti, todayIso])

  const risultatiRicerca = useMemo(() => {
    const q = ricercaEvento.trim().toLowerCase()
    if (q.length < 2) return []

    const daEventi = eventi
      .map((ev) => {
        const cliente = ev.clienti?.[0]?.cliente
        const nomeCliente = [cliente?.nome, cliente?.cognome].filter(Boolean).join(' ').trim()
        const data = ev.dataConfermata || ev.dataPrimoContatto || ev.dateProposte?.[0] || ''
        return {
          id: ev.id,
          titolo: ev.titolo || 'Evento',
          nomeCliente,
          data,
          search: `${ev.titolo || ''} ${nomeCliente}`.toLowerCase()
        }
      })
    const daPrimiContatti = primiContatti.map((cliente: any) => ({
      id: cliente.id,
      titolo: `Primo contatto - ${cliente.titolo}`,
      nomeCliente: cliente.titolo,
      data: cliente.dataPrimoContatto || '',
      search: `${cliente.titolo || ''} ${cliente.canalePrimoContatto || ''}`.toLowerCase()
    }))

    return [...daEventi, ...daPrimiContatti]
      .filter((row) => row.data && row.search.includes(q))
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 8)
  }, [eventi, primiContatti, ricercaEvento])

  const aggiungiGiorni = useCallback((isoDate: string, days: number) => {
    const d = new Date(`${isoDate}T00:00:00`)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }, [])

  const aggiungiMesi = useCallback((isoDate: string, months: number) => {
    const d = new Date(`${isoDate}T00:00:00`)
    d.setMonth(d.getMonth() + months)
    return d.toISOString().slice(0, 10)
  }, [])

  const handleDateClick = (arg: any) => {
    const data = arg.dateStr
    setDataSelezionata(data)
    const evGiorno = eventiPerData(data)
    setEventiDelGiorno(evGiorno)
    if (evGiorno.length === 0 && canManageCalendar) {
      setShowAppuntamento(true)
      setAppuntamento({ nome: '', telefono: '', email: '', ora: '10:00', note: '', canale: '' })
      setStatus('')
    }
  }

  // ──────────────────────────────────────────────────
  // EVENTI FULLCALENDAR
  // ──────────────────────────────────────────────────
  const eventiCalendarioEventi = eventi.flatMap((ev) => {
    if (ev.stato === 'annullato') return []
    const result: any[] = []

    if (ev.dataPrimoContatto) {
      result.push({
        id: `reg-${ev.id}`,
        title: `📋 ${ev.titolo}`,
        date: ev.dataPrimoContatto,
        backgroundColor: COLORI.registrazione.bg,
        borderColor: COLORI.registrazione.bg,
        extendedProps: { eventoId: ev.id, ruolo: 'registrazione', ev }
      })
    }

    if (Array.isArray(ev.dateProposte)) {
      ev.dateProposte
        .filter((d: string) => d !== ev.dataConfermata)
        .forEach((d: string) => {
          result.push({
            id: `op-${ev.id}-${d}`,
            title: ev.titolo,
            date: d,
            backgroundColor: COLORI.opzionato.bg,
            borderColor: COLORI.opzionato.bg,
            classNames: ['opacity-90'],
            extendedProps: { eventoId: ev.id, ruolo: 'opzionato', ev }
          })
        })
    }

    if (ev.dataConfermata) {
      const ruolo = ev.tipo === 'Appuntamento' ? 'appuntamento' : 'confermato'
      const color = colorePerTipo(ev.tipo, ruolo)
      result.push({
        id: `conf-${ev.id}`,
        title: ev.tipo === 'Appuntamento' ? `📞 ${ev.titolo}` : ev.titolo,
        date: ev.dataConfermata,
        backgroundColor: color,
        borderColor: color,
        extendedProps: { eventoId: ev.id, ruolo, ev }
      })
    }

    return result
  })

  const eventiCalendarioAppuntamenti = appuntamenti.map((app: any) => {
    const date = app.dataAppuntamento?.split('T')[0]
    return {
      id: `app-${app.id}`,
      title: `📞 ${app.clientePrincipale?.nome || 'Appuntamento'}${app.clientePrincipale?.cognome ? ` ${app.clientePrincipale.cognome}` : ''}`,
      date,
      backgroundColor: COLORI.appuntamento.bg,
      borderColor: COLORI.appuntamento.bg,
      extendedProps: {
        eventoId: app.id,
        ruolo: 'appuntamento',
        ev: {
          ...app,
          tipo: 'Appuntamento',
          titolo: app.riassuntoColloquio || `Appuntamento - ${app.clientePrincipale?.nome || ''}`,
          dataConfermata: date,
          _isAppointment: true
        }
      }
    }
  })

  const eventiCalendarioPrimiContatti = primiContatti.map((cliente: any) => ({
    id: `contact-${cliente.id}-${cliente.dataPrimoContatto}`,
    title: `📋 ${cliente.titolo}`,
    date: cliente.dataPrimoContatto,
    backgroundColor: COLORI.registrazione.bg,
    borderColor: COLORI.registrazione.bg,
    extendedProps: { eventoId: cliente.id, ruolo: 'registrazione-cliente', ev: cliente }
  }))

  const eventiCalendario = [...eventiCalendarioEventi, ...eventiCalendarioPrimiContatti, ...eventiCalendarioAppuntamenti]

  const eventiCalendarioFiltrati = useMemo(() => {
    if (filtroVista === 'tutti') return eventiCalendario

    return eventiCalendario.filter((item: any) => {
      const ruolo = item?.extendedProps?.ruolo
      if (filtroVista === 'confermati') return ruolo === 'confermato'
      if (filtroVista === 'opzionati') return ruolo === 'opzionato'
      if (filtroVista === 'appuntamenti') return ruolo === 'appuntamento'
      if (filtroVista === 'primi-contatti') return ruolo === 'registrazione' || ruolo === 'registrazione-cliente'
      return true
    })
  }, [eventiCalendario, filtroVista])

  // Hover tooltip
  const handleEventMouseEnter = (info: any) => {
    const ev = info.event.extendedProps.ev || eventi.find(e => e.id === info.event.extendedProps.eventoId)
    if (!ev) return
    const rect = info.el.getBoundingClientRect()
    setTooltip({
      evento: ev,
      ruolo: info.event.extendedProps.ruolo,
      x: rect.left + rect.width / 2,
      y: rect.bottom
    })
  }
  const handleEventMouseLeave = () => setTooltip(null)

  // Click singolo / doppio click
  const handleEventClick = (info: any) => {
    const eventoId = info.event.extendedProps.eventoId
    const isAppointment = Boolean(info.event.extendedProps?.ev?._isAppointment)
    const isFirstContact = info.event.extendedProps?.ruolo === 'registrazione-cliente'
    const now = Date.now()
    const last = lastClickRef.current

    if (last && last.id === eventoId && now - last.time < 400) {
      // Doppio click → apri scheda completa
      if (isAppointment) {
        if (canManageCalendar) router.push(`/appuntamenti?id=${eventoId}`)
      } else if (isFirstContact) {
        if (canManageCalendar) router.push('/clienti')
      } else {
        if (canManageCalendar) router.push(`/modifica-evento/${eventoId}`)
      }
      lastClickRef.current = null
    } else {
      lastClickRef.current = { id: eventoId, time: now }
      // Singolo click → mostra eventi del giorno
      const ev = info.event.extendedProps.ev || eventi.find(e => e.id === eventoId)
      if (ev) {
        const data = ev.dataConfermata || ev.dataPrimoContatto || ev.dateProposte?.[0]
        if (data) {
          setDataSelezionata(data)
          setEventiDelGiorno(eventiPerData(data))
        }
      }
    }
    setTooltip(null)
  }

  // Year navigator
  const goToYear = (year: number) => {
    setCurrentYear(year)
    const cal = calendarRef.current?.getApi()
    if (cal) cal.gotoDate(`${year}-01-01`)
  }

  const salvaAppuntamento = async () => {
    if (!appuntamento.nome.trim()) { setStatus('Inserisci il nome del cliente'); return }
    setIsSaving(true); setStatus('Salvataggio...')
    try {
      const res = await fetch('/api/appuntamenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataAppuntamento: `${dataSelezionata}T${appuntamento.ora || '10:00'}:00`,
          dataPrimoContatto: todayIso,
          durataMinuti: 60,
          canalePrimoContatto: appuntamento.canale || null,
          esito: 'da_fare',
          statoFunnel: 'in_trattativa',
          noteColloquio: `Telefono: ${appuntamento.telefono}\n${appuntamento.note}`,
          riassuntoColloquio: appuntamento.note || `Appuntamento con ${appuntamento.nome}`,
          clienti: [{
            nome: appuntamento.nome,
            email: appuntamento.email || `${appuntamento.nome.toLowerCase().replace(/\s+/g, '.')}@villa-paris.local`,
            telefono: appuntamento.telefono
          }]
        })
      })
      if (res.ok) {
        setStatus('Appuntamento salvato!')
        setTimeout(() => { setShowAppuntamento(false); setCalendarKey(k => k + 1) }, 900)
      } else { setStatus(`Errore: ${await res.text()}`) }
    } catch { setStatus('Errore di connessione') }
    finally { setIsSaving(false) }
  }

  const annullaEvento = async (id: number) => {
    if (!confirm('Annullare questo evento?')) return
    await fetch(`/api/eventi?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'annullato' })
    })
    setCalendarKey(k => k + 1)
  }

  const annullaAppuntamento = async (id: number) => {
    if (!confirm('Annullare questo appuntamento?')) return
    await fetch(`/api/appuntamenti?id=${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ esito: 'annullato' })
    })
    setCalendarKey(k => k + 1)
  }

  const statoLabel = (stato: string) => {
    switch (stato) {
      case 'confermato': return 'bg-green-100 text-green-700'
      case 'annullato':  return 'bg-red-100 text-red-700'
      default:           return 'bg-amber-100 text-amber-700'
    }
  }

  // Range anni disponibili
  const anni = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i)

  return (
    <div className="space-y-6" data-testid="calendario-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-amber-500" />
            Calendario Eventi
          </h1>
          <p className="text-gray-500 text-sm">Clicca su data per appuntamento · Doppio click sull'evento per aprirlo</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-full">
            <Phone className="w-3.5 h-3.5 text-violet-600" />
            <span className="text-violet-700 font-medium text-sm">{appuntamentiMese} questo mese</span>
          </div>
          {canManageCalendar && (
            <Button
              onClick={() => router.push('/nuovo-evento')}
              className="bg-amber-500 hover:bg-amber-600"
              data-testid="nuovo-evento-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Evento
            </Button>
          )}
        </div>
      </div>

      {/* Quick Year Navigator */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600 mr-1">Anno:</span>
            {anni.map(y => (
              <button
                key={y}
                onClick={() => goToYear(y)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  y === currentYear
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                }`}
              >
                {y}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-500">Vai a data:</span>
              <input
                type="date"
                className="border rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500"
                value={dataSelezionata}
                onChange={e => goToDate(e.target.value)}
                data-testid="calendario-vai-data-input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToDate(todayIso)}
                data-testid="calendario-oggi-rapido-btn"
              >
                Oggi
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!prossimoEvento}
                onClick={() => prossimoEvento && goToDate(prossimoEvento.data)}
                data-testid="calendario-prossimo-evento-btn"
              >
                Prossimo evento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToDate(aggiungiGiorni(dataSelezionata || todayIso, 7))}
                data-testid="calendario-prossima-settimana-btn"
              >
                +1 settimana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToDate(aggiungiMesi(dataSelezionata || todayIso, 1))}
                data-testid="calendario-prossimo-mese-btn"
              >
                +1 mese
              </Button>
            </div>

            <div className="w-full md:max-w-sm relative" data-testid="calendario-ricerca-wrapper">
              <Input
                value={ricercaEvento}
                onChange={(e) => setRicercaEvento(e.target.value)}
                placeholder="Cerca evento o cliente..."
                data-testid="calendario-cerca-evento-input"
              />
              {risultatiRicerca.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-lg z-20 overflow-hidden" data-testid="calendario-cerca-risultati">
                  {risultatiRicerca.map((r) => (
                    <button
                      key={`${r.id}-${r.data}`}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b last:border-b-0"
                      onClick={() => {
                        goToDate(r.data)
                        setRicercaEvento('')
                      }}
                      data-testid={`calendario-cerca-risultato-${r.id}-${r.data}`}
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{r.titolo}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.nomeCliente || 'Cliente non associato'} · {new Date(`${r.data}T12:00:00`).toLocaleDateString('it-IT')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full flex flex-wrap items-center gap-2" data-testid="calendario-filtri-wrap">
              <span className="text-sm text-gray-500 mr-1">Filtra:</span>
              {[
                { id: 'tutti', label: 'Tutti' },
                { id: 'confermati', label: 'Confermati' },
                { id: 'opzionati', label: 'Opzionati' },
                { id: 'appuntamenti', label: 'Appuntamenti' },
                { id: 'primi-contatti', label: 'Primi contatti' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroVista(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filtroVista === f.id
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-700'
                  }`}
                  data-testid={`calendario-filtro-${f.id}-btn`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario */}
      <Card>
        <CardContent className="p-4">
          <FullCalendar
            ref={calendarRef}
            key={calendarKey}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={dataSelezionata || todayIso}
            dateClick={handleDateClick}
            eventMouseEnter={handleEventMouseEnter}
            eventMouseLeave={handleEventMouseLeave}
            eventClick={handleEventClick}
            locale="it"
            height="auto"
            events={eventiCalendarioFiltrati}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek'
            }}
            buttonText={{ today: 'Oggi', month: 'Mese', week: 'Settimana' }}
            datesSet={(arg) => setCurrentYear(arg.view.currentStart.getFullYear())}
          />
        </CardContent>
      </Card>

      {/* Tooltip */}
      {tooltip && <EventTooltip info={tooltip} onClose={() => setTooltip(null)} />}

      {/* Modal Appuntamento Rapido */}
      {showAppuntamento && dataSelezionata && canManageCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md" data-testid="modal-appuntamento">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-violet-500" />
                Nuovo Appuntamento
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAppuntamento(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-violet-50 p-2.5 rounded-lg text-center">
                <p className="text-violet-700 font-medium text-sm">
                  {new Date(dataSelezionata + 'T12:00:00').toLocaleDateString('it-IT', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>
              {/* Canale di contatto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Come ci ha contattato?</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: 'telefono', label: 'Telefono', icon: '📞' },
                    { value: 'email', label: 'Mail', icon: '📧' },
                    { value: 'matrimonio.com', label: 'Matrimonio.com', icon: '💒' },
                    { value: 'social', label: 'Social', icon: '📱' },
                    { value: 'passaparola', label: 'Passaparola', icon: '🗣️' },
                    { value: 'altro', label: 'Altro', icon: '•' },
                  ].map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setAppuntamento(a => ({ ...a, canale: a.canale === c.value ? '' : c.value }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all ${
                        appuntamento.canale === c.value
                          ? 'border-violet-500 bg-violet-500 text-white shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                      }`}
                      data-testid={`canale-app-btn-${c.value}`}
                    >
                      <span>{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Cliente *</label>
                <Input value={appuntamento.nome} onChange={e => setAppuntamento({ ...appuntamento, nome: e.target.value })} placeholder="Mario Rossi" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-3.5 h-3.5 inline mr-1" />Telefono</label>
                  <Input value={appuntamento.telefono} onChange={e => setAppuntamento({ ...appuntamento, telefono: e.target.value })} placeholder="333 1234567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"><Clock className="w-3.5 h-3.5 inline mr-1" />Ora</label>
                  <Input type="time" value={appuntamento.ora} onChange={e => setAppuntamento({ ...appuntamento, ora: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"><Mail className="w-3.5 h-3.5 inline mr-1" />Email</label>
                <Input type="email" value={appuntamento.email} onChange={e => setAppuntamento({ ...appuntamento, email: e.target.value })} placeholder="mario@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <Input value={appuntamento.note} onChange={e => setAppuntamento({ ...appuntamento, note: e.target.value })} placeholder="Tipo evento, preferenze..." />
              </div>
              {status && (
                <div className={`px-3 py-2 rounded-lg text-sm ${status.includes('salvato') ? 'bg-green-50 text-green-700' : status.includes('Errore') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {status}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setShowAppuntamento(false)}>Annulla</Button>
                <Button onClick={salvaAppuntamento} disabled={isSaving} className="flex-1 bg-violet-500 hover:bg-violet-600" data-testid="salva-appuntamento-btn">
                  {isSaving ? 'Salvataggio...' : 'Conferma'}
                </Button>
              </div>
              <div className="text-center">
                <Button variant="link" size="sm" onClick={() => { setShowAppuntamento(false); router.push(`/nuovo-evento?data=${dataSelezionata}${appuntamento.canale ? `&canale=${appuntamento.canale}` : ''}`) }}>
                  Crea evento completo →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pannello eventi del giorno (click su data con eventi) */}
      {dataSelezionata && eventiDelGiorno.length > 0 && !showAppuntamento && (
        <Card data-testid="eventi-giorno">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                {new Date(dataSelezionata + 'T12:00:00').toLocaleDateString('it-IT', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </CardTitle>
              <div className="flex gap-2">
                {canManageCalendar && (
                  <Button size="sm" variant="outline" onClick={() => setShowAppuntamento(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Appuntamento
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEventiDelGiorno([])}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {eventiDelGiorno.map((e) => {
              const isAppointment = Boolean(e._isAppointment)
              const isFirstContact = Boolean(e._isFirstContact)
              const isReg = isFirstContact || (e.dataPrimoContatto === dataSelezionata && e.dataConfermata !== dataSelezionata)
              const isOp  = Array.isArray(e.dateProposte) && e.dateProposte.includes(dataSelezionata) && e.dataConfermata !== dataSelezionata
              const ruolo = isReg ? 'registrazione' : isOp ? 'opzionato' : (e.tipo === 'Appuntamento' || isAppointment) ? 'appuntamento' : 'confermato'
              const dot   = colorePerTipo(e.tipo, ruolo)
              const cp    = isFirstContact ? e.clientePrincipale : (e.clienti?.[0]?.cliente || e.clientePrincipale)
              return (
                <div key={`${e.id}-${ruolo}`} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {isReg ? '📋 ' : (e.tipo === 'Appuntamento' || isAppointment) ? '📞 ' : ''}{e.titolo}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{isFirstContact ? 'Primo contatto' : e.tipo}</span>
                        {isReg && <span className="text-xs bg-amber-900/10 text-amber-800 px-1.5 py-0.5 rounded-full">1° contatto</span>}
                        {isOp  && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">opzionato</span>}
                        {e.personePreviste > 0 && <span className="text-xs text-gray-400">{e.personePreviste} ospiti</span>}
                        {isFirstContact && e.canalePrimoContatto && <span className="text-xs text-gray-400">{e.canalePrimoContatto}</span>}
                        {cp?.telefono && <span className="text-xs text-gray-400">{cp.telefono}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoLabel(e.stato)}`}>
                      {(isFirstContact ? e.canalePrimoContatto || 'primo contatto' : (isAppointment ? e.esito || 'da_fare' : e.stato))?.replace('_', ' ')}
                    </span>
                    {canManageCalendar && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-7 h-7 p-0"
                        onClick={() => router.push(isAppointment ? `/appuntamenti?id=${e.id}` : isFirstContact ? '/clienti' : `/modifica-evento/${e.id}`)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canManageCalendar && !isFirstContact && (
                      <Button variant="ghost" size="sm" className="w-7 h-7 p-0 text-red-400 hover:text-red-600"
                        onClick={() => isAppointment ? annullaAppuntamento(e.id) : annullaEvento(e.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      <Card>
        <CardContent className="p-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Legenda:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {Object.entries(COLORI).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: val.bg }} />
                <span className="text-xs text-gray-600">{val.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
