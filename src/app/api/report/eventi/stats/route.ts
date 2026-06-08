import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31, 23, 59, 59)

    const eventi = await prisma.evento.findMany({
      where: {
        dataConfermata: { gte: startOfYear, lte: endOfYear },
        tipo: { not: 'Appuntamento' },
        stato: { not: 'annullato' }
      }
    })

    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    const monthly = monthNames.map((mese, index) => ({
      mese,
      meseFull: new Date(year, index).toLocaleString('it-IT', { month: 'long' }),
      eventi: 0,
      ospiti: 0,
      ricavi: 0,
      ticketMedio: 0
    }))

    const getPrezzoEvento = (evento: any) => {
      const prezzoEvento = Number(evento.prezzo)
      if (Number.isFinite(prezzoEvento) && prezzoEvento > 0) return prezzoEvento
      const struttura = typeof evento.struttura === 'string'
        ? (() => {
            try { return JSON.parse(evento.struttura || '{}') } catch { return {} }
          })()
        : (evento.struttura || {})
      const prezzoDaStruttura = Number(struttura?.prezzo)
      return Number.isFinite(prezzoDaStruttura) && prezzoDaStruttura > 0 ? prezzoDaStruttura : 0
    }

    eventi.forEach((evento) => {
      if (!evento.dataConfermata) return
      const month = new Date(evento.dataConfermata).getMonth()
      const persone = evento.personePreviste || 0
      const ricavo = persone * getPrezzoEvento(evento)
      monthly[month].eventi += 1
      monthly[month].ospiti += persone
      monthly[month].ricavi += ricavo
    })

    monthly.forEach((row) => {
      row.ticketMedio = row.ospiti > 0 ? Math.round(row.ricavi / row.ospiti) : 0
    })

    const byTipo: Record<string, { tipo: string; count: number; ricavi: number }> = {}
    eventi.forEach((evento) => {
      const tipo = evento.tipo || 'Altro'
      if (!byTipo[tipo]) byTipo[tipo] = { tipo, count: 0, ricavi: 0 }
      byTipo[tipo].count += 1
      byTipo[tipo].ricavi += (evento.personePreviste || 0) * getPrezzoEvento(evento)
    })

    const totals = {
      eventiTotali: eventi.length,
      ospitiTotali: eventi.reduce((sum, evento) => sum + (evento.personePreviste || 0), 0),
      ricaviTotali: eventi.reduce((sum, evento) => sum + (evento.personePreviste || 0) * getPrezzoEvento(evento), 0),
      ticketMedio: 0
    }
    totals.ticketMedio = totals.ospitiTotali > 0 ? Math.round(totals.ricaviTotali / totals.ospitiTotali) : 0

    return NextResponse.json({ year, monthly, byTipo: Object.values(byTipo), totals })
  } catch (error) {
    console.error('Error fetching event report stats:', error)
    return new NextResponse('Errore nel recupero statistiche eventi', { status: 500 })
  }
}