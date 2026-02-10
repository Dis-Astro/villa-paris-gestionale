import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

/**
 * GET /api/report/stats
 * Ritorna statistiche per grafici dashboard
 * Query params: year (default: current year)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // Get all events for the year
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const eventi = await prisma.evento.findMany({
      where: {
        dataConfermata: {
          gte: startOfYear,
          lte: endOfYear
        }
      }
    })

    // Initialize monthly data
    const monthNames = [
      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
    ]

    const monthlyData = monthNames.map((name, index) => ({
      mese: name,
      meseFull: new Date(year, index).toLocaleString('it-IT', { month: 'long' }),
      eventi: 0,
      ospiti: 0,
      ricavi: 0,
      ticketMedio: 0
    }))

    // Aggregate data by month
    eventi.forEach(evento => {
      if (!evento.dataConfermata) return
      
      const month = new Date(evento.dataConfermata).getMonth()
      const persone = evento.personePreviste || 0
      const prezzo = evento.prezzo || 80
      const ricavo = persone * prezzo

      monthlyData[month].eventi++
      monthlyData[month].ospiti += persone
      monthlyData[month].ricavi += ricavo
    })

    // Calculate ticket medio
    monthlyData.forEach(m => {
      m.ticketMedio = m.ospiti > 0 ? Math.round(m.ricavi / m.ospiti) : 0
    })

    // Aggregate by tipo evento
    const tipoData: Record<string, { tipo: string; count: number; ricavi: number }> = {}
    eventi.forEach(evento => {
      const tipo = evento.tipo || 'Altro'
      if (!tipoData[tipo]) {
        tipoData[tipo] = { tipo, count: 0, ricavi: 0 }
      }
      tipoData[tipo].count++
      tipoData[tipo].ricavi += (evento.personePreviste || 0) * (evento.prezzo || 80)
    })

    // Totals
    const totals = {
      eventiTotali: eventi.length,
      ospitiTotali: eventi.reduce((sum, e) => sum + (e.personePreviste || 0), 0),
      ricaviTotali: eventi.reduce((sum, e) => sum + (e.personePreviste || 0) * (e.prezzo || 80), 0),
      ticketMedio: 0
    }
    totals.ticketMedio = totals.ospitiTotali > 0 
      ? Math.round(totals.ricaviTotali / totals.ospitiTotali) 
      : 0

    return NextResponse.json({
      year,
      monthly: monthlyData,
      byTipo: Object.values(tipoData),
      totals
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    return new NextResponse('Errore nel recupero statistiche', { status: 500 })
  }
}
