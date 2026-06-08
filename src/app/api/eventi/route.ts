import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  calcolaInfoBlocco,
  getCampiBloccatiModificati,
  validateOverrideHeaders,
  registraOverride,
  OVERRIDE_HEADERS
} from '@/lib/blocco-evento'
import { actorFromHeaders, writeAuditLog } from '@/lib/audit'
import { syncEventoToGcal, removeEventoFromGcal } from '@/lib/google-calendar-sync'
import { dbJsonParse, dbJsonSerialize } from '@/lib/db-json'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const has = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

function parseDate(value: any): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

async function resolveClientIds(clientiRaw: any[], fallbackCanale?: string | null, fallbackData?: Date | null) {
  const ids: number[] = []

  for (const cr of clientiRaw || []) {
    if (cr.id) {
      ids.push(Number(cr.id))
      continue
    }
    if (!cr.nome?.trim()) continue
    const email = cr.email?.trim() || `${cr.nome.toLowerCase().replace(/\s+/g, '.')}@villa-paris.local`

    let cliente = await prisma.cliente.findFirst({ where: { email } })
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nome: cr.nome.trim(),
          cognome: cr.cognome?.trim() || null,
          email,
          telefono: cr.telefono?.trim() || null,
          tipoCliente: cr.tipoCliente || null,
          canalePrimoContatto: fallbackCanale || null,
          dataPrimoContatto: parseDate(cr.dataPrimoContatto) || fallbackData || new Date()
        }
      })
    }

    ids.push(cliente.id)
  }

  return ids
}

// CREA UN NUOVO EVENTO
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const actor = {
      ...actorFromHeaders(req.headers),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      actorEmail: auth.user.email
    }
    console.log('POST /api/eventi - body:', JSON.stringify(body).substring(0, 500))
    
    const clientiRaw = body.clienti || []
    if (clientiRaw.length === 0 || !clientiRaw[0]?.nome) {
      return new NextResponse('Dati cliente mancanti', { status: 400 })
    }

    // Crea o trova tutti i clienti
    const clienteIds = await resolveClientIds(
      clientiRaw,
      body.canalePrimoContatto || null,
      parseDate(body.dataPrimoContatto)
    )

    const evento = await prisma.evento.create({
      data: {
        tipo: body.tipo,
        titolo: body.titolo,
        dateProposte: dbJsonSerialize(body.dateProposte ?? []),
        dataConfermata: parseDate(body.dataConfermata),
        dataPrimoContatto: parseDate(body.dataPrimoContatto) || new Date(),
        canalePrimoContatto: body.canalePrimoContatto || null,
        fascia: body.fascia,
        personePreviste: body.personePreviste ? parseInt(body.personePreviste) : null,
        note: body.note ?? '',
        stato: body.stato ?? 'in_attesa',
        menu: dbJsonSerialize(body.menu || {}),
        struttura: dbJsonSerialize(body.struttura || {}),
        disposizioneSala: dbJsonSerialize(body.disposizioneSala),
        luogo: body.luogo || null,
        prezzo: body.prezzo ? parseFloat(body.prezzo) : null,
        menuPasto: body.menuPasto || null,
        menuBuffet: body.menuBuffet || null,
        sposa: body.sposa || null,
        sposo: body.sposo || null,
        appuntamentoOrigineId: body.appuntamentoOrigineId ? Number(body.appuntamentoOrigineId) : null,
        clienti: {
          create: clienteIds.map(id => ({ cliente: { connect: { id } } }))
        }
      },
      include: {
        clienti: { include: { cliente: true } }
      }
    })

    if (body.appuntamentoOrigineId) {
      await prisma.appuntamento.update({
        where: { id: Number(body.appuntamentoOrigineId) },
        data: {
          statoFunnel: 'confermato',
          statoOpzione: 'confermata'
        }
      }).catch(() => null)
    }

    await writeAuditLog({
      entityType: 'EVENT',
      entityId: evento.id,
      action: 'CREATE',
      newValue: evento,
      actor
    })

    // Sincronizza con Google Calendar alla creazione
    syncEventoToGcal(evento.id).catch(() => {})

    console.log('POST /api/eventi - Evento creato ID:', evento.id, 'Clienti:', clienteIds.length)
    return NextResponse.json(evento)
  } catch (error) {
    console.error('Errore creazione evento:', error)
    return new NextResponse("Errore nel salvataggio dell'evento", { status: 500 })
  }
}

// RECUPERA TUTTI GLI EVENTI O UNO SINGOLO SE SPECIFICATO L'ID
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const summary = searchParams.get('summary')

    if (id && !isNaN(Number(id))) {
      const evento = await prisma.evento.findUnique({
        where: { id: Number(id) },
        include: {
          clienti: {
            include: { cliente: true }
          },
          appuntamentoOrigine: {
            select: { id: true, dataAppuntamento: true, esito: true, statoFunnel: true }
          },
          versioni: {
            orderBy: { numero: 'desc' },
            take: 1,
            select: { numero: true }
          }
        }
      })

      if (!evento) {
        return new NextResponse('Evento non trovato', { status: 404 })
      }

      // Aggiungi info blocco
      const infoBlocco = calcolaInfoBlocco(evento.dataConfermata)
      const ultimaVersione = evento.versioni[0]?.numero || 0

      return NextResponse.json({
        ...evento,
        _blocco: infoBlocco,
        _versioneCorrente: ultimaVersione
      })
    }

    if (summary === 'notifications') {
      const now = new Date()
      const in30Days = addDays(now, 30)
      const eventi = await prisma.evento.findMany({
        where: {
          dataConfermata: {
            gt: now,
            lte: in30Days
          }
        },
        orderBy: { dataConfermata: 'asc' },
        take: 20,
        select: {
          id: true,
          titolo: true,
          dataConfermata: true
        }
      })

      return NextResponse.json(eventi)
    }

    const eventi = await prisma.evento.findMany({
      orderBy: { dataConfermata: 'asc' },
      include: {
        clienti: {
          include: { cliente: true }
        },
        appuntamentoOrigine: {
          select: { id: true, dataAppuntamento: true, esito: true, statoFunnel: true }
        }
      }
    })

    return NextResponse.json(eventi.map((e) => ({
      ...e,
      dateProposte: dbJsonParse(e.dateProposte, []),
      menu: dbJsonParse(e.menu, {}),
      struttura: dbJsonParse(e.struttura, {}),
      disposizioneSala: dbJsonParse(e.disposizioneSala, null)
    })))
  } catch (error) {
    console.error('Errore nel recupero eventi:', error)
    return new NextResponse('Errore durante il recupero degli eventi', { status: 500 })
  }
}

// AGGIORNA UN EVENTO (con blocco -10 giorni)
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return new NextResponse('ID mancante', { status: 400 })

    const body = await req.json()
    const actor = {
      ...actorFromHeaders(req.headers),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      actorEmail: auth.user.email
    }

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

    const before = await prisma.evento.findUnique({
      where: { id },
      include: { clienti: { include: { cliente: true } } }
    })
    if (!before) return new NextResponse('Evento non trovato', { status: 404 })

    const updateData: any = {}
    if (has(body, 'tipo')) updateData.tipo = body.tipo
    if (has(body, 'titolo')) updateData.titolo = body.titolo
    if (has(body, 'dataConfermata')) updateData.dataConfermata = parseDate(body.dataConfermata)
    if (has(body, 'fascia')) updateData.fascia = body.fascia
    if (has(body, 'stato')) updateData.stato = body.stato
    if (has(body, 'personePreviste')) updateData.personePreviste = body.personePreviste ? parseInt(body.personePreviste) : null
    if (has(body, 'note')) updateData.note = body.note ?? ''
    if (has(body, 'menu')) updateData.menu = dbJsonSerialize(body.menu)
    if (has(body, 'struttura')) updateData.struttura = dbJsonSerialize(body.struttura)
    if (has(body, 'disposizioneSala')) updateData.disposizioneSala = dbJsonSerialize(body.disposizioneSala)
    if (has(body, 'disposizioneSalePianoB')) updateData.disposizioneSalaPianoB = dbJsonSerialize(body.disposizioneSalePianoB)
    if (has(body, 'pianoAttivo')) updateData.pianoAttivo = body.pianoAttivo || null
    if (has(body, 'dateProposte')) updateData.dateProposte = dbJsonSerialize(body.dateProposte ?? [])
    if (has(body, 'luogo')) updateData.luogo = body.luogo || null
    if (has(body, 'prezzo')) updateData.prezzo = body.prezzo ? parseFloat(body.prezzo) : null
    if (has(body, 'menuPasto')) updateData.menuPasto = body.menuPasto || null
    if (has(body, 'menuBuffet')) updateData.menuBuffet = body.menuBuffet || null
    if (has(body, 'sposa')) updateData.sposa = body.sposa || null
    if (has(body, 'sposo')) updateData.sposo = body.sposo || null
    if (has(body, 'dataPrimoContatto')) updateData.dataPrimoContatto = parseDate(body.dataPrimoContatto)
    if (has(body, 'canalePrimoContatto')) updateData.canalePrimoContatto = body.canalePrimoContatto || null
    if (has(body, 'appuntamentoOrigineId')) updateData.appuntamentoOrigineId = body.appuntamentoOrigineId ? Number(body.appuntamentoOrigineId) : null

    const evento = await prisma.$transaction(async (tx) => {
      if (Array.isArray(body.clienti)) {
        const clienteIds = await resolveClientIds(
          body.clienti,
          has(body, 'canalePrimoContatto') ? body.canalePrimoContatto : before.canalePrimoContatto,
          has(body, 'dataPrimoContatto') ? parseDate(body.dataPrimoContatto) : before.dataPrimoContatto
        )
        await tx.eventoCliente.deleteMany({ where: { eventoId: id } })
        if (clienteIds.length) {
          await tx.eventoCliente.createMany({
            data: clienteIds.map((clienteId) => ({ eventoId: id, clienteId }))
          })
        }
      }

      return tx.evento.update({ where: { id }, data: updateData })
    })

    await writeAuditLog({
      entityType: 'EVENT',
      entityId: id,
      action: 'UPDATE',
      oldValue: before,
      newValue: evento,
      actor,
      metadata: {
        blockedFieldsModified: campiBloccatiModificati,
        wasBlocked: infoBlocco.isBloccato
      }
    })

    // Sincronizza automaticamente con Google Calendar (non bloccante)
    syncEventoToGcal(id).catch(() => {})

    return NextResponse.json(evento)
  } catch (error) {
    console.error('Errore aggiornamento evento:', error)
    return new NextResponse("Errore durante l'aggiornamento", { status: 500 })
  }
}

// ELIMINA UN EVENTO
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return new NextResponse('ID mancante', { status: 400 })
    }

    const actor = {
      ...actorFromHeaders(req.headers),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      actorEmail: auth.user.email
    }
    const before = await prisma.evento.findUnique({ where: { id } })
    if (!before) return new NextResponse('Evento non trovato', { status: 404 })

    await prisma.eventoCliente.deleteMany({ where: { eventoId: id } })
    const deleted = await prisma.evento.delete({ where: { id } })

    await writeAuditLog({
      entityType: 'EVENT',
      entityId: id,
      action: 'DELETE',
      oldValue: before,
      actor
    })

    // Rimuovi da Google Calendar (non bloccante)
    removeEventoFromGcal(before.gcalEventId).catch(() => {})

    return NextResponse.json(deleted)
  } catch (error) {
    console.error('Errore eliminazione evento:', error)
    return new NextResponse("Errore durante l'eliminazione", { status: 500 })
  }
}
