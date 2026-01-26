import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

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

// AGGIORNA UN EVENTO
export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return new NextResponse('ID mancante', { status: 400 })

    const body = await req.json()

    // Log solo il necessario, non la base64
    console.log('API DEBUG PUT - tavoli:', body.disposizioneSala?.tavoli?.length, 'stazioni:', body.disposizioneSala?.stazioni?.length)
    if (body.disposizioneSala?.immagine) {
      console.log('API DEBUG PUT - immagine: caricata (lunghezza:', body.disposizioneSala.immagine.length, ')')
    } else {
      console.log('API DEBUG PUT - nessuna immagine caricata')
    }

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

    // Log conferma update
    console.log('API DEBUG PUT after update - tavoli:', evento.disposizioneSala?.tavoli?.length, 'stazioni:', evento.disposizioneSala?.stazioni?.length)

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
