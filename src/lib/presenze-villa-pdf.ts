// @ts-ignore - pdfmake runtime import
import pdfMake from 'pdfmake/build/pdfmake'
// @ts-ignore - pdfmake runtime import
import pdfFonts from 'pdfmake/build/vfs_fonts'

// @ts-ignore
pdfMake.vfs = pdfFonts.vfs

export interface PresenzaVillaItem {
  id: number
  dataRiferimento: string
  nome: string
  cognome: string
  azienda: string
  orarioIngresso: string
  orarioUscita: string
  motivoVisita: string
  mansioneSvolta: string
  note?: string | null
  createdByUser?: {
    email?: string | null
  } | null
}

export function downloadPresenzeVillaPdf(params: {
  mode: 'day' | 'week'
  selectedDate: string
  items: PresenzaVillaItem[]
}) {
  const title = params.mode === 'week' ? 'Report settimanale presenze Villa' : 'Rapportino giornaliero presenze Villa'
  const subtitle = params.mode === 'week'
    ? `Settimana di riferimento: ${new Date(`${params.selectedDate}T12:00:00`).toLocaleDateString('it-IT')}`
    : `Data di riferimento: ${new Date(`${params.selectedDate}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}`

  const tableBody = [
    ['Data', 'Nome', 'Cognome', 'Azienda', 'Ingresso', 'Uscita', 'Motivo', 'Mansione svolta'],
    ...params.items.map((item) => ([
      new Date(item.dataRiferimento).toLocaleDateString('it-IT'),
      item.nome,
      item.cognome,
      item.azienda,
      item.orarioIngresso,
      item.orarioUscita,
      item.motivoVisita,
      item.mansioneSvolta
    ]))
  ]

  const notes = params.items
    .filter((item) => item.note)
    .map((item) => `${item.nome} ${item.cognome} - ${item.note}`)

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [28, 28, 28, 28],
    content: [
      { text: 'VILLA PARIS', fontSize: 12, bold: true, color: '#F59E0B' },
      { text: title, fontSize: 22, bold: true, color: '#111827', margin: [0, 4, 0, 4] },
      { text: subtitle, color: '#475569', margin: [0, 0, 0, 8] },
      { text: `Totale presenze registrate: ${params.items.length}`, bold: true, margin: [0, 0, 0, 12] },
      {
        table: {
          headerRows: 1,
          widths: [55, 70, 80, 90, 48, 48, 120, '*'],
          body: tableBody
        },
        layout: 'lightHorizontalLines'
      },
      ...(notes.length ? [{ text: 'Note interne', style: 'sectionTitle' }, { ul: notes, margin: [0, 0, 0, 0] }] : [])
    ],
    styles: {
      sectionTitle: { fontSize: 14, bold: true, color: '#1E3A5F', margin: [0, 16, 0, 8] }
    },
    defaultStyle: { fontSize: 9, color: '#0F172A' }
  }

  pdfMake.createPdf(docDefinition).download(`VillaParis_Presenze_${params.mode}_${params.selectedDate}.pdf`)
}
