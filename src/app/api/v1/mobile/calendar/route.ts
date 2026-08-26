import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validDate(value: string | null, fallback: Date) {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.status })

  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 7)
  const defaultTo = new Date(now)
  defaultTo.setDate(defaultTo.getDate() + 90)
  const params = req.nextUrl.searchParams
  const from = validDate(params.get('from'), defaultFrom)
  const requestedTo = validDate(params.get('to'), defaultTo)
  const maxTo = new Date(from)
  maxTo.setFullYear(maxTo.getFullYear() + 1)
  const to = requestedTo > maxTo ? maxTo : requestedTo

  if (to < from) {
    return NextResponse.json({ error: { code: 'INVALID_RANGE', message: 'Intervallo date non valido' } }, { status: 400 })
  }

  const [events, appointments] = await Promise.all([
    prisma.evento.findMany({
      where: { dataConfermata: { gte: from, lte: to } },
      orderBy: { dataConfermata: 'asc' },
      select: {
        id: true,
        titolo: true,
        tipo: true,
        dataConfermata: true,
        fascia: true,
        stato: true,
        personePreviste: true,
        luogo: true
      }
    }),
    prisma.appuntamento.findMany({
      where: { dataAppuntamento: { gte: from, lte: to } },
      orderBy: { dataAppuntamento: 'asc' },
      select: {
        id: true,
        dataAppuntamento: true,
        durataMinuti: true,
        esito: true,
        statoFunnel: true,
        tipoEventoRichiesto: true,
        personePreviste: true,
        clientePrincipale: { select: { id: true, nome: true, cognome: true } }
      }
    })
  ])

  return NextResponse.json({
    apiVersion: '1',
    range: { from: from.toISOString(), to: to.toISOString() },
    events,
    appointments
  }, { headers: { 'Cache-Control': 'private, max-age=30' } })
}
