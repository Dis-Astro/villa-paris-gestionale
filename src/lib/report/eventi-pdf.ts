import { formatDate, formatDateTime } from '@/lib/report/types'

// @ts-ignore - pdfmake runtime import
import pdfMake from 'pdfmake/build/pdfmake'
// @ts-ignore - pdfmake runtime import
import pdfFonts from 'pdfmake/build/vfs_fonts'

// @ts-ignore - runtime init
pdfMake.vfs = pdfFonts.vfs

export interface EventReportStats {
  year: number
  monthly: Array<{
    mese: string
    meseFull: string
    eventi: number
    ospiti: number
    ricavi: number
    ticketMedio: number
  }>
  byTipo: Array<{
    tipo: string
    count: number
    ricavi: number
  }>
  totals: {
    eventiTotali: number
    ospitiTotali: number
    ricaviTotali: number
    ticketMedio: number
  }
}

export interface EventReportFilters {
  year: number
  dateFrom: string
  dateTo: string
  tipoFilter: string
  luogoFilter: string
}

function parseStructure(raw: any) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  return raw
}

function eventPrice(evento: any) {
  const prezzoEvento = Number(evento?.prezzo)
  if (Number.isFinite(prezzoEvento) && prezzoEvento > 0) return prezzoEvento
  const prezzoStruttura = Number(parseStructure(evento?.struttura)?.prezzo)
  return Number.isFinite(prezzoStruttura) && prezzoStruttura > 0 ? prezzoStruttura : 0
}

function primaryClient(evento: any) {
  return evento?.clienti?.[0]?.cliente || null
}

function eventTotal(evento: any) {
  return (evento?.personePreviste || 0) * eventPrice(evento)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0)
}

function safeText(value: any) {
  return typeof value === 'string' ? value.trim() : ''
}

export function filterHistoricEvents(eventi: any[], filters: EventReportFilters) {
  const start = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : new Date(filters.year, 0, 1)
  const end = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : new Date(filters.year, 11, 31, 23, 59, 59)
  const luogoFilter = safeText(filters.luogoFilter).toLowerCase()

  return (Array.isArray(eventi) ? eventi : [])
    .filter((evento) => evento?.stato !== 'annullato' && evento?.tipo !== 'Appuntamento' && evento?.dataConfermata)
    .filter((evento) => {
      const data = new Date(evento.dataConfermata)
      return data >= start && data <= end
    })
    .filter((evento) => !filters.tipoFilter || evento?.tipo === filters.tipoFilter)
    .filter((evento) => !luogoFilter || safeText(evento?.luogo).toLowerCase().includes(luogoFilter))
    .sort((a, b) => new Date(a.dataConfermata).getTime() - new Date(b.dataConfermata).getTime())
}

export function downloadEventReportPdf(stats: EventReportStats, eventi: any[], filters: EventReportFilters) {
  const appliedFilters = [
    `Anno: ${filters.year}`,
    filters.dateFrom ? `Dal: ${formatDate(filters.dateFrom, { day: '2-digit', month: '2-digit', year: 'numeric' })}` : '',
    filters.dateTo ? `Al: ${formatDate(filters.dateTo, { day: '2-digit', month: '2-digit', year: 'numeric' })}` : '',
    filters.tipoFilter ? `Tipo: ${filters.tipoFilter}` : '',
    filters.luogoFilter ? `Luogo: ${filters.luogoFilter}` : ''
  ].filter(Boolean).join(' • ')

  const summaryBody = [
    ['KPI', 'Valore'],
    ['Eventi totali', String(stats.totals.eventiTotali)],
    ['Ospiti totali', String(stats.totals.ospitiTotali)],
    ['Ricavi totali', formatCurrency(stats.totals.ricaviTotali)],
    ['Ticket medio', formatCurrency(stats.totals.ticketMedio)],
    ['Eventi nel PDF', String(eventi.length)]
  ]

  const monthlyBody = [
    ['Mese', 'Eventi', 'Ospiti', 'Ricavi', 'Ticket medio'],
    ...stats.monthly.filter((row) => row.eventi > 0 || row.ospiti > 0 || row.ricavi > 0).map((row) => ([
      row.meseFull,
      row.eventi,
      row.ospiti,
      formatCurrency(row.ricavi),
      formatCurrency(row.ticketMedio)
    ]))
  ]

  const byTipoBody = [
    ['Tipo evento', 'Numero eventi', 'Ricavi'],
    ...stats.byTipo.map((row) => ([row.tipo, row.count, formatCurrency(row.ricavi)]))
  ]

  const eventiBody = [
    ['Data', 'Evento', 'Cliente principale', 'Tipo', 'Luogo', 'Ospiti', 'Totale'],
    ...eventi.map((evento) => ([
      formatDate(evento.dataConfermata, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      safeText(evento.titolo) || 'Evento',
      [primaryClient(evento)?.nome, primaryClient(evento)?.cognome].filter(Boolean).join(' ') || safeText(evento.sposa) || 'Cliente non definito',
      safeText(evento.tipo) || '—',
      safeText(evento.luogo) || 'Villa Paris',
      String(evento.personePreviste || 0),
      formatCurrency(eventTotal(evento))
    ]))
  ]

  const detailSections = eventi.flatMap((evento, index) => {
    const clienti = (evento.clienti || []).map((entry: any) => entry?.cliente || entry).filter(Boolean)
    const clientiLines = clienti.length
      ? clienti.map((cliente: any) => ([
          `${safeText(cliente.nome)} ${safeText(cliente.cognome)}`.trim() || 'Cliente',
          [safeText(cliente.telefono), safeText(cliente.email)].filter(Boolean).join(' • ') || 'Contatti non presenti',
          [safeText(cliente.canalePrimoContatto), formatDate(cliente.dataPrimoContatto, { day: '2-digit', month: '2-digit', year: 'numeric' })].filter((value) => value && value !== '—').join(' • ') || 'N/D'
        ]))
      : [['Cliente non disponibile', '—', '—']]

    const detailTable = [
      ['Campo', 'Valore'],
      ['Titolo', safeText(evento.titolo) || 'Evento'],
      ['Data evento', formatDate(evento.dataConfermata, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })],
      ['Tipo evento', safeText(evento.tipo) || '—'],
      ['Luogo', safeText(evento.luogo) || 'Villa Paris'],
      ['Fascia', safeText(evento.fascia) || '—'],
      ['Persone previste', String(evento.personePreviste || 0)],
      ['Prezzo/persona', formatCurrency(eventPrice(evento))],
      ['Totale stimato', formatCurrency(eventTotal(evento))],
      ['Menu pasto', safeText(evento.menuPasto) || '—'],
      ['Menu buffet', safeText(evento.menuBuffet) || '—'],
      ['Sposa/Festeggiato', safeText(evento.sposa) || '—'],
      ['Sposo', safeText(evento.sposo) || '—'],
      ['Note', safeText(evento.note) || '—']
    ]

    return [
      { text: `${index + 1}. ${safeText(evento.titolo) || 'Evento storico'}`, style: 'eventTitle', margin: [0, index === 0 ? 0 : 16, 0, 6] },
      {
        columns: [
          {
            width: '58%',
            stack: [
              {
                table: { headerRows: 1, widths: [120, '*'], body: detailTable },
                layout: 'lightHorizontalLines'
              }
            ]
          },
          {
            width: '42%',
            stack: [
              { text: 'Anagrafiche clienti collegate', style: 'miniSection' },
              {
                table: {
                  headerRows: 1,
                  widths: [110, '*', 110],
                  body: [['Cliente', 'Contatti', 'Primo contatto / canale'], ...clientiLines]
                },
                layout: 'lightHorizontalLines'
              }
            ]
          }
        ],
        columnGap: 12
      }
    ]
  })

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 28, 28, 28],
    content: [
      { text: 'VILLA PARIS — Report Eventi', fontSize: 22, bold: true, color: '#1E3A5F' },
      { text: appliedFilters || `Anno ${filters.year}`, margin: [0, 4, 0, 2], color: '#475569' },
      { text: `Generato il ${formatDateTime(new Date().toISOString())}`, margin: [0, 0, 0, 12], color: '#475569' },
      {
        columns: [
          {
            width: '35%',
            table: { headerRows: 1, widths: ['*', 110], body: summaryBody },
            layout: 'lightHorizontalLines'
          },
          {
            width: '65%',
            stack: [
              { text: 'Andamento mensile', style: 'sectionTitle' },
              {
                table: { headerRows: 1, widths: ['*', 55, 60, 80, 80], body: monthlyBody },
                layout: 'lightHorizontalLines'
              }
            ]
          }
        ],
        columnGap: 16
      },
      { text: 'Distribuzione per tipologia evento', style: 'sectionTitle' },
      {
        table: { headerRows: 1, widths: ['*', 90, 100], body: byTipoBody },
        layout: 'lightHorizontalLines'
      },
      { text: 'Elenco eventi filtrati', style: 'sectionTitle' },
      {
        table: { headerRows: 1, widths: [70, '*', 130, 90, 90, 55, 90], body: eventiBody },
        layout: 'lightHorizontalLines'
      },
      { text: 'Dettaglio eventi e anagrafiche collegate', style: 'sectionTitle', pageBreak: 'before' },
      ...(detailSections.length ? detailSections : [{ text: 'Nessun evento storico disponibile per i filtri selezionati.', italics: true, color: '#64748B' }])
    ],
    styles: {
      sectionTitle: { fontSize: 14, bold: true, color: '#1E3A5F', margin: [0, 16, 0, 8] },
      miniSection: { fontSize: 11, bold: true, color: '#334155', margin: [0, 0, 0, 6] },
      eventTitle: { fontSize: 13, bold: true, color: '#0F172A' }
    },
    defaultStyle: { fontSize: 9, color: '#0F172A' }
  }

  pdfMake.createPdf(docDefinition).download(`VillaParis_Report_Eventi_${filters.year}_${new Date().toISOString().slice(0, 10)}.pdf`)
}