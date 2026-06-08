import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    // Recupera visitatori distinti degli ultimi 6 mesi
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const presenze = await prisma.presenzaVilla.findMany({
      where: {
        dataRiferimento: { gte: sixMonthsAgo }
      },
      select: {
        nome: true,
        cognome: true,
        azienda: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    })

    // Crea set di visitatori unici (nome+cognome+azienda)
    const visitatoriMap = new Map<string, { nome: string; cognome: string; azienda: string; count: number }>()

    for (const p of presenze) {
      const key = `${p.nome.toLowerCase()}|${p.cognome.toLowerCase()}|${p.azienda.toLowerCase()}`
      const existing = visitatoriMap.get(key)
      if (existing) {
        existing.count++
      } else {
        visitatoriMap.set(key, { nome: p.nome, cognome: p.cognome, azienda: p.azienda, count: 1 })
      }
    }

    // Ordina per frequenza decrescente e prendi i top 30
    const visitatori = Array.from(visitatoriMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)

    return NextResponse.json({ visitatori })
  } catch (error) {
    console.error('Errore suggerimenti presenze:', error)
    return NextResponse.json({ error: 'Errore nel recupero suggerimenti' }, { status: 500 })
  }
}
