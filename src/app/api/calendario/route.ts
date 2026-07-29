import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { dbJsonParse } from '@/lib/db-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function threeYearsAgo() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 3)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const from = threeYearsAgo()
    const [eventi, appuntamenti, primiContatti] = await Promise.all([
      prisma.evento.findMany({
        where: {
          OR: [
            { dataConfermata: { gte: from } },
            { dataPrimoContatto: { gte: from } },
            { createdAt: { gte: from } }
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
          fascia: true,
          stato: true,
          personePreviste: true,
          note: true,
          clienti: {
            take: 1,
            select: {
              clienteId: true,
              cliente: {
                select: {
                  id: true,
                  nome: true,
                  cognome: true,
                  telefono: true,
                  email: true
                }
              }
            }
          }
        }
      }),
      prisma.appuntamento.findMany({
        where: { dataAppuntamento: { gte: from } },
        orderBy: { dataAppuntamento: 'desc' },
        select: {
          id: true,
          dataAppuntamento: true,
          durataMinuti: true,
          esito: true,
          riassuntoColloquio: true,
          noteColloquio: true,
          statoFunnel: true,
          dateOpzionate: true,
          statoOpzione: true,
          clientePrincipale: {
            select: {
              id: true,
              nome: true,
              cognome: true,
              telefono: true,
              email: true
            }
          }
        }
      }),
      prisma.cliente.findMany({
        where: { dataPrimoContatto: { gte: from } },
        orderBy: { dataPrimoContatto: 'asc' },
        select: {
          id: true,
          nome: true,
          cognome: true,
          telefono: true,
          email: true,
          dataPrimoContatto: true,
          canalePrimoContatto: true,
          isSpam: true
        }
      })
    ])

    return NextResponse.json({
      from: from.toISOString(),
      eventi: eventi.map((evento) => ({
        ...evento,
        dateProposte: dbJsonParse(evento.dateProposte, [])
      })),
      appuntamenti: appuntamenti.map((appuntamento) => ({
        ...appuntamento,
        dateOpzionate: dbJsonParse(appuntamento.dateOpzionate, [])
      })),
      primiContatti
    })
  } catch (error) {
    console.error('[Calendario] Errore caricamento dati:', error)
    return NextResponse.json({ error: 'Errore caricamento calendario' }, { status: 500 })
  }
}
