import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import {
  calcolaInfoBlocco,
  getCampiBloccatiModificati,
  validateOverrideHeaders,
  registraOverride,
  OVERRIDE_HEADERS
} from '@/lib/blocco-evento'

// Force Node.js runtime per Prisma
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// CREA UN NUOVO EVENTO
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const clienteRaw = body.clienti?.[0]

    if (!clienteRaw?.email || !clienteRaw?.nome) {
      return new NextResponse('Dati cliente mancanti', { status: 400 })
    }

    let cliente = await prisma.cliente.findFirst({
      where: { email: clienteRaw.email }
    })

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: clienteRaw.nome,
          cognome: clienteRaw.cognome,
          email: clienteRaw.email,
          telefono: clienteRaw.telefono || null
        }
      })
    }

    const evento = await prisma.evento.create({
      data: {
        tipo: body.tipo,
        titolo: body.titolo,
        dateProposte: body.dateProposte ?? [],
        dataConfermata: body.dataConfermata ? new Date(body.dataConfermata) : null,
        fascia: body.fascia,
        personePreviste: body.personePreviste ? parseInt(body.personePreviste) : null,
        note: body.note ?? '',
        stato: body.stato ?? 'in_attesa',
        menu: body.menu || {},
        struttura: body.struttura || {},
        disposizioneSala: body.disposizioneSala || null,
        clienti: {
          create: [{ cliente: { connect: { id: cliente.id } } }]
        }
      },
      include: {
        clienti: {
          include: { cliente: true }
        }
      }
    })

    return NextResponse.json(evento)
  } catch (error) {
    console.error('Errore creazione evento:', error)
    return new NextResponse("Errore nel salvataggio dell'evento", { status: 500 })
  }
}

// RECUPERA TUTTI GLI EVENTI O UNO SINGOLO SE SPECIFICATO L'ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id && !isNaN(Number(id))) {
      const evento = await prisma.evento.findUnique({
        where: { id: Number(id) },
        include: {
          clienti: {
            include: { cliente: true }
          }
        }
      })

      if (!evento) {
        return new NextResponse('Evento non trovato', { status: 404 })
      }

      return NextResponse.json(evento)
    }

    const eventi = await prisma.evento.findMany({
      orderBy: { dataConfermata: 'asc' },
      include: {
        clienti: {
          include: { cliente: true }
        }
      }
    })

    return NextResponse.json(eventi)
  } catch (error) {
    console.error('Errore nel recupero eventi:', error)
    return new NextResponse('Errore durante il recupero degli eventi', { status: 500 })
  }
}

// AGGIORNA UN EVENTO (con blocco -10 giorni)
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return new NextResponse('ID mancante', { status: 400 })

    const body = await req.json()

    // Recupera evento esistente per verificare blocco
    const eventoEsistente = await prisma.evento.findUnique({
      where: { id }
    })

    if (!eventoEsistente) {
      return new NextResponse('Evento non trovato', { status: 404 })
    }

    // Verifica blocco -10 giorni
    const infoBlocco = calcolaInfoBlocco(eventoEsistente.dataConfermata)
    const campiBloccatiModificati = getCampiBloccatiModificati(body)

    if (infoBlocco.isBloccato && campiBloccatiModificati.length > 0) {
      // Verifica override headers
      const overrideResult = validateOverrideHeaders(req.headers)

      if (!overrideResult.valid) {
        return new NextResponse(
          JSON.stringify({
            error: 'Evento bloccato',
            message: infoBlocco.messaggioBlocco,
            giorniMancanti: infoBlocco.giorniMancanti,
            campiBloccati: campiBloccatiModificati,
            overrideRequired: true,
            overrideHeaders: {
              token: OVERRIDE_HEADERS.TOKEN,
              motivo: OVERRIDE_HEADERS.MOTIVO,
              autore: OVERRIDE_HEADERS.AUTORE
            },
            overrideError: overrideResult.error
          }),
          { 
            status: 423,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Override valido: registra nel log
      await registraOverride(id, {
        ...overrideResult.override!,
        campoModificato: campiBloccatiModificati.join(', ')
      })

      console.log(`[OVERRIDE] Evento ${id} modificato con override: ${overrideResult.override!.motivo}`)
    }

    // Log solo il necessario, non la base64
    console.log('API DEBUG PUT - tavoli:', body.disposizioneSala?.tavoli?.length, 'stazioni:', body.disposizioneSala?.stazioni?.length)

    const evento = await prisma.evento.update({
      where: { id },
      data: {
        tipo: body.tipo,
        titolo: body.titolo,
        dataConfermata: body.dataConfermata ? new Date(body.dataConfermata) : null,
        fascia: body.fascia,
        stato: body.stato,
        personePreviste: body.personePreviste ? parseInt(body.personePreviste) : null,
        note: body.note,
        menu: body.menu,
        struttura: body.struttura,
        disposizioneSala: body.disposizioneSala || null,
        dateProposte: body.dateProposte ?? []
      }
    })

    return NextResponse.json(evento)
  } catch (error) {
    console.error('Errore aggiornamento evento:', error)
    return new NextResponse("Errore durante l'aggiornamento", { status: 500 })
  }
}

// ELIMINA UN EVENTO
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return new NextResponse('ID mancante', { status: 400 })
    }

    await prisma.eventoCliente.deleteMany({ where: { eventoId: id } })
    const deleted = await prisma.evento.delete({ where: { id } })

    return NextResponse.json(deleted)
  } catch (error) {
    console.error('Errore eliminazione evento:', error)
    return new NextResponse("Errore durante l'eliminazione", { status: 500 })
  }
}
