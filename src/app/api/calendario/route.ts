import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { dbJsonParse } from '@/lib/db-json'
import { getCalendarWindow } from '@/lib/calendar-window'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { from, to } = getCalendarWindow()
    const [eventi, appuntamenti, primiContatti] = await Promise.all([
      prisma.evento.findMany({
        where: {
          OR: [
            { dataConfermata: { gte: from, lte: to } },
            { dataPrimoContatto: { gte: from, lte: to } },
            {
              dataConfermata: null,
              dataPrimoContatto: null,
              createdAt: { gte: from, lte: to }
            }
          ]
        },
        orderBy: { dataConfermata: 'asc' },
        select: {
          id: true,
          titolo: true,
          tipo: true,
          dataConfermata: true,
          dataPrimoContatto: true,
          canalePrimoContatto: true,
          dateProposte: true,
          stato: true,
          personePreviste: true,
          clienti: {
            take: 1,
            select: {
              clienteId: true,
              cliente: {
                select: {
                  id: true,
                  nome: true,
                  cognome: true,
                  telefono: true
                }
              }
            }
          }
        }
      }),
      prisma.appuntamento.findMany({
        where: { dataAppuntamento: { gte: from, lte: to } },
        orderBy: { dataAppuntamento: 'desc' },
        select: {
          id: true,
          dataAppuntamento: true,
          esito: true,
          riassuntoColloquio: true,
          clientePrincipale: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              telefono: true
            }
          }
        }
      }),
      prisma.cliente.findMany({
        where: { dataPrimoContatto: { gte: from, lte: to } },
        orderBy: { dataPrimoContatto: 'asc' },
        select: {
          id: true,
          nome: true,
          cognome: true,
          telefono: true,
          dataPrimoContatto: true,
          canalePrimoContatto: true,
          isSpam: true
        }
      })
    ])

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      eventi: eventi.map((evento) => ({
        ...evento,
        dateProposte: dbJsonParse(evento.dateProposte, [])
      })),
      appuntamenti,
      primiContatti
    }, {
      headers: {
        // Risposta privata: il browser può riusarla brevemente, mai una cache condivisa.
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
        'Vary': 'Cookie, Authorization'
      }
    })
  } catch (error) {
    console.error('[Calendario] Errore caricamento dati:', error)
    return NextResponse.json({ error: 'Errore caricamento calendario' }, { status: 500 })
  }
}
