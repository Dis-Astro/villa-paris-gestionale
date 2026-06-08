import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { requireAuth } from '@/lib/auth'
import { formatDateTime, formatMinutes } from '@/lib/report/types'
import { getOperationalReport, parseReportFilters } from '@/lib/report/operational'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const filters = parseReportFilters(searchParams)
    const report = await getOperationalReport(filters)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Villa Paris Gestionale'
    wb.created = new Date()

    const applyHeader = (row: ExcelJS.Row, cells: number) => {
      row.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 }
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } }
      row.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      for (let c = 1; c <= cells; c += 1) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        }
      }
    }

    const styleDataRow = (row: ExcelJS.Row, cells: number, fill?: string) => {
      if (fill) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
      }
      for (let c = 1; c <= cells; c += 1) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        }
      }
    }

    const summarySheet = wb.addWorksheet('Sintesi Operativa', {
      properties: { tabColor: { argb: 'D4AF37' } },
      pageSetup: { orientation: 'landscape', fitToPage: true }
    })

    summarySheet.columns = [
      { key: 'label', width: 36 },
      { key: 'value', width: 24 },
      { key: 'note', width: 60 }
    ]

    summarySheet.mergeCells('A1:C1')
    const titleCell = summarySheet.getCell('A1')
    titleCell.value = 'VILLA PARIS – Report Operativo'
    titleCell.font = { bold: true, size: 16, color: { argb: '1E3A5F' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    summarySheet.getRow(1).height = 28

    summarySheet.mergeCells('A2:C2')
    const periodCell = summarySheet.getCell('A2')
    periodCell.value = `${report.meta.periodLabel} • Generato il ${formatDateTime(report.meta.generatedAt)}`
    periodCell.font = { italic: true, size: 10, color: { argb: '6B7280' } }
    periodCell.alignment = { horizontal: 'center' }

    summarySheet.addRow([])
    const summaryHeader = summarySheet.addRow(['KPI', 'Valore', 'Note'])
    applyHeader(summaryHeader, 3)

    const summaryRows = [
      ['Contatti principali', report.summary.contactsPrimary, 'Nel settimanale gli spam restano visibili in rosso; nei periodi lunghi sono esclusi dalla policy.'],
      ['Contatti validi', report.summary.contactsValid, 'Contatti non spam nel periodo.'],
      ['Contatti spam', report.summary.contactsSpam, 'Valore informativo per controllo qualità lead.'],
      ['Appuntamenti fissati', report.summary.appointmentsScheduled, 'Conteggio univoco degli appuntamenti nel periodo.'],
      ['Appuntamenti svolti', report.summary.appointmentsCompleted, 'Esiti: svolto, positivo, negativo.'],
      ['Interazioni cliente', report.summary.interactionsCount, 'Esclude le interazioni auto-generate di tipo appuntamento per evitare doppi conteggi.'],
      ['Tempo totale dedicato', formatMinutes(report.summary.totalTimeMinutes), 'Appuntamenti + interazioni manuali.'],
      ['Eventi confermati', report.summary.confirmedEvents, 'Eventi con data confermata nel periodo.'],
      ['Clienti coinvolti', report.summary.clientsCount, 'Clienti con contatto o attività nel periodo.'],
      ['Spam esclusi dalla policy', report.summary.contactsExcludedByPolicy, report.meta.spamPolicyLabel]
    ]

    summaryRows.forEach((values, index) => {
      const row = summarySheet.addRow(values)
      styleDataRow(row, 3, index % 2 === 0 ? 'F8FAFC' : undefined)
    })

    const clientsSheet = wb.addWorksheet('Clienti Periodo', {
      properties: { tabColor: { argb: '2563EB' } },
      pageSetup: { orientation: 'landscape', fitToPage: true }
    })
    clientsSheet.columns = [
      { key: 'cliente', width: 24 },
      { key: 'fonte', width: 16 },
      { key: 'primoContatto', width: 18 },
      { key: 'spam', width: 12 },
      { key: 'appFissati', width: 14 },
      { key: 'appSvolti', width: 14 },
      { key: 'interazioni', width: 14 },
      { key: 'tempo', width: 16 },
      { key: 'eventi', width: 14 },
      { key: 'operatori', width: 28 },
      { key: 'esiti', width: 18 },
      { key: 'funnel', width: 18 },
      { key: 'riassunto', width: 42 }
    ]
    const clientsHeader = clientsSheet.addRow([
      'Cliente', 'Provenienza', 'Primo contatto', 'Spam', 'App. fissati', 'App. svolti',
      'Interazioni', 'Tempo dedicato', 'Eventi', 'Operatori', 'Esiti', 'Funnel', 'Riassunto'
    ])
    applyHeader(clientsHeader, 13)

    report.clients.forEach((client, index) => {
      const row = clientsSheet.addRow({
        cliente: client.fullName,
        fonte: client.source,
        primoContatto: formatDateTime(client.firstContactAt),
        spam: client.isSpam ? `SI${client.spamReason ? ` - ${client.spamReason}` : ''}` : 'No',
        appFissati: client.appointmentsScheduled,
        appSvolti: client.appointmentsCompleted,
        interazioni: client.interactionsCount,
        tempo: formatMinutes(client.totalTimeMinutes),
        eventi: client.confirmedEvents,
        operatori: client.operators.join(', '),
        esiti: client.outcomes.join(', '),
        funnel: client.funnels.join(', '),
        riassunto: client.summary
      })
      const fill = client.isSpam ? 'FEE2E2' : (index % 2 === 0 ? 'F8FAFC' : undefined)
      styleDataRow(row, 13, fill)
      if (client.isSpam) {
        row.font = { color: { argb: '991B1B' }, bold: true }
      }
    })

    const activitiesSheet = wb.addWorksheet('Attivita', {
      properties: { tabColor: { argb: '0EA5E9' } }
    })
    activitiesSheet.columns = [
      { key: 'data', width: 20 },
      { key: 'cliente', width: 22 },
      { key: 'tipo', width: 18 },
      { key: 'operatore', width: 24 },
      { key: 'esito', width: 16 },
      { key: 'durata', width: 14 },
      { key: 'riepilogo', width: 52 }
    ]
    const activitiesHeader = activitiesSheet.addRow(['Data', 'Cliente', 'Tipo', 'Operatore', 'Esito/Stato', 'Durata', 'Riepilogo'])
    applyHeader(activitiesHeader, 7)
    report.activities.forEach((activity, index) => {
      const row = activitiesSheet.addRow({
        data: formatDateTime(activity.date),
        cliente: activity.clientName,
        tipo: activity.type,
        operatore: activity.operator,
        esito: activity.outcome,
        durata: formatMinutes(activity.durationMinutes),
        riepilogo: activity.summary
      })
      styleDataRow(row, 7, activity.isSpam ? 'FEE2E2' : (index % 2 === 0 ? 'F8FAFC' : undefined))
    })

    const sourcesSheet = wb.addWorksheet('Provenienza Lead', {
      properties: { tabColor: { argb: '22C55E' } }
    })
    sourcesSheet.columns = [
      { key: 'source', width: 24 },
      { key: 'totale', width: 14 },
      { key: 'validi', width: 14 },
      { key: 'spam', width: 14 }
    ]
    const sourcesHeader = sourcesSheet.addRow(['Provenienza', 'Contatti totali', 'Contatti validi', 'Spam'])
    applyHeader(sourcesHeader, 4)
    report.sources.forEach((source, index) => {
      const row = sourcesSheet.addRow({
        source: source.source,
        totale: source.contactsTotal,
        validi: source.contactsValid,
        spam: source.contactsSpam
      })
      styleDataRow(row, 4, index % 2 === 0 ? 'F8FAFC' : undefined)
    })

    const operatorsSheet = wb.addWorksheet('Operatori', {
      properties: { tabColor: { argb: 'A855F7' } }
    })
    operatorsSheet.columns = [
      { key: 'operatore', width: 26 },
      { key: 'clienti', width: 12 },
      { key: 'fissati', width: 16 },
      { key: 'svolti', width: 16 },
      { key: 'interazioni', width: 14 },
      { key: 'tempo', width: 16 },
      { key: 'eventi', width: 14 }
    ]
    const operatorsHeader = operatorsSheet.addRow(['Operatore', 'Clienti', 'App. fissati', 'App. svolti', 'Interazioni', 'Tempo dedicato', 'Eventi confermati'])
    applyHeader(operatorsHeader, 7)
    report.operators.forEach((operator, index) => {
      const row = operatorsSheet.addRow({
        operatore: operator.operatorName,
        clienti: operator.clientsCount,
        fissati: operator.appointmentsScheduled,
        svolti: operator.appointmentsCompleted,
        interazioni: operator.interactionsCount,
        tempo: formatMinutes(operator.totalTimeMinutes),
        eventi: operator.confirmedEvents
      })
      styleDataRow(row, 7, index % 2 === 0 ? 'F8FAFC' : undefined)
    })

    if (report.spamClients.length > 0) {
      const spamSheet = wb.addWorksheet('Spam Settimanale', {
        properties: { tabColor: { argb: 'DC2626' } }
      })
      spamSheet.columns = [
        { key: 'cliente', width: 24 },
        { key: 'motivo', width: 26 },
        { key: 'fonte', width: 18 },
        { key: 'primoContatto', width: 18 },
        { key: 'riassunto', width: 48 }
      ]
      const spamHeader = spamSheet.addRow(['Cliente', 'Motivo spam', 'Provenienza', 'Primo contatto', 'Riepilogo'])
      applyHeader(spamHeader, 5)
      report.spamClients.forEach((client) => {
        const row = spamSheet.addRow({
          cliente: client.fullName,
          motivo: client.spamReason || 'Non specificato',
          fonte: client.source,
          primoContatto: formatDateTime(client.firstContactAt),
          riassunto: client.summary
        })
        styleDataRow(row, 5, 'FEE2E2')
        row.font = { color: { argb: '991B1B' }, bold: true }
      })
    }

    const buffer = await wb.xlsx.writeBuffer()
    const filename = `VillaParis_Report_${filters.period}_${filters.referenceDate}.xlsx`

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    })
  } catch (error) {
    console.error('[Report Excel] Errore:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Errore nella generazione del report', detail: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
