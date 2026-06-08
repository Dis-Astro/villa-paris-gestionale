import { OperationalReportResponse, formatDateTime, formatMinutes } from '@/lib/report/types'

// @ts-ignore - pdfmake runtime import
import pdfMake from 'pdfmake/build/pdfmake'
// @ts-ignore - pdfmake runtime import
import pdfFonts from 'pdfmake/build/vfs_fonts'

// @ts-ignore - runtime init
pdfMake.vfs = pdfFonts.vfs

export function downloadOperationalReportPdf(report: OperationalReportResponse) {
  const summaryBody = [
    ['KPI', 'Valore'],
    ['Contatti principali', String(report.summary.contactsPrimary)],
    ['Contatti validi', String(report.summary.contactsValid)],
    ['Contatti spam', String(report.summary.contactsSpam)],
    ['Appuntamenti fissati', String(report.summary.appointmentsScheduled)],
    ['Appuntamenti svolti', String(report.summary.appointmentsCompleted)],
    ['Interazioni', String(report.summary.interactionsCount)],
    ['Tempo dedicato', formatMinutes(report.summary.totalTimeMinutes)],
    ['Eventi confermati', String(report.summary.confirmedEvents)]
  ]

  const clientsBody = [
    ['Cliente', 'Fonte', 'App.', 'Interazioni', 'Tempo', 'Operatori', 'Esiti', 'Riassunto'],
    ...report.clients.slice(0, 24).map((client) => ([
      client.isSpam ? `${client.fullName} (SPAM)` : client.fullName,
      client.source,
      client.appointmentsScheduled,
      client.interactionsCount,
      formatMinutes(client.totalTimeMinutes),
      client.operators.join(', ') || '—',
      client.outcomes.join(', ') || '—',
      client.summary
    ]))
  ]

  const activitiesBody = [
    ['Data', 'Cliente', 'Tipo', 'Operatore', 'Esito/Stato', 'Durata', 'Dettaglio'],
    ...report.activities.slice(0, 30).map((activity) => ([
      formatDateTime(activity.date),
      activity.clientName,
      activity.type,
      activity.operator,
      activity.outcome,
      formatMinutes(activity.durationMinutes),
      activity.summary
    ]))
  ]

  const sourcesBody = [
    ['Provenienza', 'Totale', 'Validi', 'Spam'],
    ...report.sources.map((source) => ([source.source, source.contactsTotal, source.contactsValid, source.contactsSpam]))
  ]

  const operatorsBody = [
    ['Operatore', 'Clienti', 'App. fissati', 'App. svolti', 'Interazioni', 'Tempo', 'Eventi'],
    ...report.operators.map((operator) => ([
      operator.operatorName,
      operator.clientsCount,
      operator.appointmentsScheduled,
      operator.appointmentsCompleted,
      operator.interactionsCount,
      formatMinutes(operator.totalTimeMinutes),
      operator.confirmedEvents
    ]))
  ]

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 30, 30, 30],
    content: [
      { text: 'VILLA PARIS — Report Operativo', fontSize: 20, bold: true, color: '#1E3A5F' },
      { text: `${report.meta.periodLabel}\nGenerato il ${formatDateTime(report.meta.generatedAt)}`, margin: [0, 4, 0, 12], color: '#475569' },
      { text: report.meta.spamPolicyLabel, margin: [0, 0, 0, 12], color: '#B91C1C' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 120],
          body: summaryBody
        },
        layout: 'lightHorizontalLines'
      },
      { text: 'Provenienza lead', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 80, 80, 80],
          body: sourcesBody
        },
        layout: 'lightHorizontalLines'
      },
      { text: 'Operatori coinvolti', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 60, 70, 70, 70, 80, 60],
          body: operatorsBody
        },
        layout: 'lightHorizontalLines'
      },
      { text: 'Clienti del periodo', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [110, 70, 40, 55, 55, 85, 70, '*'],
          body: clientsBody
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return '#E2E8F0'
            const row = report.clients[rowIndex - 1]
            return row?.isSpam ? '#FEE2E2' : null
          },
          hLineColor: () => '#CBD5E1',
          vLineColor: () => '#CBD5E1'
        }
      },
      { text: 'Attività registrate', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: [70, 90, 70, 90, 70, 55, '*'],
          body: activitiesBody
        },
        layout: 'lightHorizontalLines'
      }
    ],
    styles: {
      sectionTitle: {
        fontSize: 14,
        bold: true,
        color: '#1E3A5F',
        margin: [0, 16, 0, 8]
      }
    },
    defaultStyle: {
      fontSize: 9,
      color: '#0F172A'
    }
  }

  pdfMake.createPdf(docDefinition).download(`VillaParis_Report_${report.appliedFilters.period}_${report.appliedFilters.referenceDate}.pdf`)
}