import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Estendi lo schema Prisma per le versioni se necessario
// Per ora usiamo un campo JSON nell'evento per memorizzare le versioni

/**
 * GET - Recupera versioni di un evento
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const eventoId = Number(searchParams.get('eventoId'))
    
    if (!eventoId) {
      return new NextResponse('eventoId mancante', { status: 400 })
    }

    const evento = await prisma.evento.findUnique({
      where: { id: eventoId }
    })

    if (!evento) {
      return new NextResponse('Evento non trovato', { status: 404 })
    }

    // Le versioni sono memorizzate nel campo struttura.versioni
    const struttura = evento.struttura as any || {}
    const versioni = struttura.versioni || []

    return NextResponse.json(versioni)
  } catch (error) {
    console.error('Errore recupero versioni:', error)
    return new NextResponse('Errore nel recupero versioni', { status: 500 })
  }
}

/**
 * POST - Crea nuova versione (snapshot) dell'evento
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { eventoId, tipo, tipoDocumento, commento } = body

    if (!eventoId || !tipo || !tipoDocumento) {
      return new NextResponse('Parametri mancanti', { status: 400 })
    }

    // Recupera evento completo
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

    // Prepara snapshot
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
      dataConfermata: evento.dataConfermata?.toISOString(),
      dateProposte: evento.dateProposte,
      fascia: evento.fascia,
      personePreviste: evento.personePreviste,
      note: evento.note,
      clienti: clientiSnapshot,
      menu: evento.menu,
      disposizioneSala: evento.disposizioneSala
    }

    // Calcola hash per integrità
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex')
      .substring(0, 16)

    // Recupera versioni esistenti
    const struttura = evento.struttura as any || {}
    const versioni = struttura.versioni || []
    
    // Numero nuova versione
    const nuovoNumero = versioni.length + 1

    // Crea nuova versione
    const nuovaVersione = {
      id: crypto.randomUUID(),
      eventoId: evento.id,
      numero: nuovoNumero,
      tipo,
      tipoDocumento,
      snapshot,
      createdAt: new Date().toISOString(),
      commento: commento || `Versione ${tipo} generata automaticamente`,
      hash
    }

    // Aggiorna evento con nuova versione
    await prisma.evento.update({
      where: { id: evento.id },
      data: {
        struttura: {
          ...struttura,
          versioni: [...versioni, nuovaVersione]
        }
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
