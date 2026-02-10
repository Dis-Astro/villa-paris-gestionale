import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

/**
 * GET /api/report/azienda.xlsx
 * Genera report Excel con formato aziendale
 * Query params: from, to, tipo, luogo
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const tipo = searchParams.get('tipo')
    const luogo = searchParams.get('luogo')

    // Build query filters
    const where: any = {}
    
    if (from || to) {
      where.dataConfermata = {}
      if (from) where.dataConfermata.gte = new Date(from)
      if (to) where.dataConfermata.lte = new Date(to)
    }
    
    if (tipo) where.tipo = tipo
    if (luogo) where.luogo = luogo

    // Fetch eventi with clients
    const eventi = await prisma.evento.findMany({
      where,
      include: {
        clienti: {
          include: { cliente: true }
        }
      },
      orderBy: { dataConfermata: 'asc' }
    })

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Villa Paris Gestionale'
    workbook.created = new Date()

    // Sheet 1: Report Aziendale
    const sheet = workbook.addWorksheet('Report Aziendale', {
      properties: { tabColor: { argb: 'FFD700' } }
    })

    // Define columns (matching your template)
    sheet.columns = [
      { header: 'Mese', key: 'mese', width: 15 },
      { header: 'Evento', key: 'evento', width: 25 },
      { header: 'Sposa / Festeggiato', key: 'sposa', width: 20 },
      { header: 'Sposo', key: 'sposo', width: 20 },
      { header: 'Menù pasto', key: 'menuPasto', width: 30 },
      { header: 'Menù Buffet', key: 'menuBuffet', width: 30 },
      { header: 'Luogo', key: 'luogo', width: 15 },
      { header: 'Pranzo/Cena', key: 'fascia', width: 12 },
      { header: 'N°Persone', key: 'persone', width: 12 },
      { header: 'Prezzo', key: 'prezzo', width: 12 },
      { header: 'Totale', key: 'totale', width: 15 }
    ]

    // Style header row
    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E3A5F' }
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
    headerRow.height = 25

    // Add data rows
    eventi.forEach((evento, index) => {
      const rowNum = index + 2
      
      // Get cliente principale
      const clientePrincipale = evento.clienti[0]?.cliente
      
      // Determina sposa/festeggiato
      let sposa = evento.sposa || ''
      let sposo = evento.sposo || ''
      
      if (!sposa && clientePrincipale) {
        sposa = `${clientePrincipale.nome} ${clientePrincipale.cognome}`
      }

      // Menu descriptions
      const menuObj = evento.menu as any
      const menuPasto = evento.menuPasto || 
        (menuObj?.portate?.map((p: any) => p.nome).join(', ')) || 
        ''
      const menuBuffet = evento.menuBuffet || ''

      // Add row
      const row = sheet.addRow({
        mese: evento.dataConfermata 
          ? new Date(evento.dataConfermata).toLocaleDateString('it-IT')
          : '',
        evento: evento.titolo,
        sposa: sposa,
        sposo: sposo,
        menuPasto: menuPasto,
        menuBuffet: menuBuffet,
        luogo: evento.luogo || 'Villa Paris',
        fascia: evento.fascia === 'pranzo' ? 'Pranzo' : 
                evento.fascia === 'cena' ? 'Cena' : evento.fascia,
        persone: evento.personePreviste || 0,
        prezzo: evento.prezzo || 80,
        totale: { formula: `I${rowNum}*J${rowNum}` }
      })

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        }
      }

      // Format currency columns
      row.getCell('prezzo').numFmt = '€#,##0.00'
      row.getCell('totale').numFmt = '€#,##0.00'
    })

    // Add totals row
    const lastDataRow = eventi.length + 1
    const totalsRow = sheet.addRow({
      mese: '',
      evento: 'TOTALE',
      sposa: '',
      sposo: '',
      menuPasto: '',
      menuBuffet: '',
      luogo: '',
      fascia: '',
      persone: { formula: `SUM(I2:I${lastDataRow})` },
      prezzo: '',
      totale: { formula: `SUM(K2:K${lastDataRow})` }
    })

    totalsRow.font = { bold: true }
    totalsRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D4AF37' }
    }
    totalsRow.getCell('totale').numFmt = '€#,##0.00'

    // Add borders to all cells
    const lastRow = eventi.length + 2
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= 11; col++) {
        const cell = sheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'E5E7EB' } },
          left: { style: 'thin', color: { argb: 'E5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
          right: { style: 'thin', color: { argb: 'E5E7EB' } }
        }
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Return Excel file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="VillaParis_Report_${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error generating Excel report:', error)
    return new NextResponse('Errore nella generazione del report', { status: 500 })
  }
}
