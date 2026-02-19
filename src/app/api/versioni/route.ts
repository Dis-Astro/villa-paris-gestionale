import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET - Lista versioni per evento
 * Query params: eventoId (required), id (optional per singola versione)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const eventoId = searchParams.get('eventoId')
    const versioneId = searchParams.get('id')
    
    if (!eventoId) {
      return new NextResponse('eventoId mancante', { status: 400 })
    }

    // Se richiesta singola versione
    if (versioneId) {
      const versione = await prisma.versioneEvento.findUnique({
        where: { id: versioneId }
      })
      
      if (!versione || versione.eventoId !== Number(eventoId)) {
        return new NextResponse('Versione non trovata', { status: 404 })
      }
      
      return NextResponse.json(versione)
    }

    // Lista tutte le versioni per evento
    const versioni = await prisma.versioneEvento.findMany({
      where: { eventoId: Number(eventoId) },
      orderBy: { numero: 'desc' },
      select: {
        id: true,
        numero: true,
        tipo: true,
        watermark: true,
        autore: true,
        commento: true,
        createdAt: true,
        hash: true
        // snapshot escluso dalla lista per performance
      }
    })

    return NextResponse.json(versioni)
  } catch (error) {
    console.error('Errore recupero versioni:', error)
    return new NextResponse('Errore nel recupero versioni', { status: 500 })
  }
}

/**
 * POST - Crea nuova versione (snapshot) dell'evento
 * Body: { eventoId, tipo, watermark, commento?, autore? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventoId, tipo, watermark, commento, autore } = body

    if (!eventoId || !tipo || !watermark) {
      return new NextResponse('Parametri mancanti (eventoId, tipo, watermark)', { status: 400 })
    }

    // Recupera evento completo con relazioni
    const evento = await prisma.evento.findUnique({
      where: { id: Number(eventoId) },
      include: {
        clienti: {
          include: { cliente: true }
        }
      }
    })

    if (!evento) {
      return new NextResponse('Evento non trovato', { status: 404 })
    }

    // Prepara snapshot completo
    const clientiSnapshot = evento.clienti.map(ec => ({
      id: ec.cliente.id,
      nome: ec.cliente.nome,
      cognome: ec.cliente.cognome,
      email: ec.cliente.email,
      telefono: ec.cliente.telefono
    }))

    const snapshot = {
      titolo: evento.titolo,
      tipo: evento.tipo,
      stato: evento.stato,
      dataConfermata: evento.dataConfermata?.toISOString() || null,
      dateProposte: evento.dateProposte,
      fascia: evento.fascia,
      personePreviste: evento.personePreviste,
      note: evento.note,
      clienti: clientiSnapshot,
      menu: evento.menu,
      struttura: evento.struttura,
      disposizioneSala: evento.disposizioneSala
    }

    // Calcola hash per integrità
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex')
      .substring(0, 16)

    // Conta versioni esistenti per numero progressivo
    const countVersioni = await prisma.versioneEvento.count({
      where: { eventoId: Number(eventoId) }
    })
    const nuovoNumero = countVersioni + 1

    // Crea nuova versione
    const nuovaVersione = await prisma.versioneEvento.create({
      data: {
        eventoId: Number(eventoId),
        numero: nuovoNumero,
        tipo,
        watermark,
        snapshot,
        hash,
        autore: autore || null,
        commento: commento || `Versione ${tipo} - ${watermark}`
      }
    })

    return NextResponse.json({
      versione: nuovaVersione,
      numero: nuovoNumero
    })
  } catch (error) {
    console.error('Errore creazione versione:', error)
    return new NextResponse('Errore nella creazione versione', { status: 500 })
  }
}
