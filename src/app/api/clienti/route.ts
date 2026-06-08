import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { actorFromHeaders, writeAuditLog } from '@/lib/audit'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const has = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

function parseDate(value: any): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function buildFirstContactSummary(canale?: string | null, note?: string | null) {
  const parts = ['Primo contatto registrato']
  if (canale) parts.push(`via ${canale}`)
  if (note) parts.push(`— ${note.trim()}`)
  return parts.join(' ')
}

// GET /api/clienti          → lista tutti
// GET /api/clienti?id=X     → dettaglio singolo
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: Number(id) },
        include: {
          eventi: {
            include: { evento: true }
          },
          appuntamentiPrincipali: { select: { id: true, dataAppuntamento: true, durataMinuti: true, esito: true } },
          interazioni: { select: { id: true, tipo: true, durataMinuti: true, dataInterazione: true } }
        }
      })
      if (!cliente) return new NextResponse('Cliente non trovato', { status: 404 })
      return NextResponse.json(cliente)
    }

    const clienti = await prisma.cliente.findMany({
      include: {
        eventi: { select: { id: true } },
        appuntamentiPrincipali: { select: { id: true, durataMinuti: true } },
        interazioni: { select: { id: true, durataMinuti: true } }
      },
      orderBy: { cognome: 'asc' }
    })

    return NextResponse.json(
      clienti.map((c) => ({
        ...c,
        statsPreEvento: {
          totaleAppuntamenti: c.appuntamentiPrincipali.length,
          tempoTotaleDedicatoMin:
            c.appuntamentiPrincipali.reduce((sum, a) => sum + (a.durataMinuti || 0), 0) +
            c.interazioni.reduce((sum, i) => sum + (i.durataMinuti || 0), 0),
          totaleInterazioni: c.interazioni.length
        }
      }))
    )
  } catch (error) {
    console.error('Errore nel recupero clienti:', error)
    return new NextResponse('Errore database', { status: 500 })
  }
}

// POST /api/clienti → crea nuovo cliente
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
    if (!body.nome?.trim()) {
      return new NextResponse('Nome obbligatorio', { status: 400 })
    }

    const dataPrimoContatto = parseDate(body.dataPrimoContatto) || new Date()
    const cliente = await prisma.cliente.create({
      data: {
        nome:                    body.nome.trim(),
        cognome:                 body.cognome?.trim() || null,
        email:                   body.email?.trim() || null,
        telefono:                body.telefono?.trim() || null,
        telefonoAlt:             body.telefonoAlt?.trim() || null,
        indirizzo:               body.indirizzo?.trim() || null,
        cap:                     body.cap?.trim() || null,
        citta:                   body.citta?.trim() || null,
        dataNascita:             parseDate(body.dataNascita),
        codiceFiscale:           body.codiceFiscale?.trim() || null,
        tipoCliente:             body.tipoCliente || null,
        canalePrimoContatto:     body.canalePrimoContatto || null,
        dataPrimoContatto,
        isSpam:                  Boolean(body.isSpam),
        spamReason:              body.spamReason?.trim() || null,
        spamMarkedAt:            body.isSpam ? new Date() : null,
        secondoContattoNome:     body.secondoContattoNome?.trim() || null,
        secondoContattoTelefono: body.secondoContattoTelefono?.trim() || null,
        secondoContattoEmail:    body.secondoContattoEmail?.trim() || null,
        notaAnagrafica:          body.notaAnagrafica?.trim() || null,
      }
    })

    await prisma.interazioneCliente.create({
      data: {
        clienteId: cliente.id,
        tipo: 'primo_contatto',
        durataMinuti: 0,
        sintesi: buildFirstContactSummary(body.canalePrimoContatto || null, body.notaAnagrafica || null),
        operatoreId: auth.user.id,
        dataInterazione: dataPrimoContatto
      }
    })

    await writeAuditLog({
      entityType: 'CLIENT',
      entityId: cliente.id,
      action: 'CREATE',
      newValue: cliente,
      actor
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error) {
    console.error('Errore creazione cliente:', error)
    return new NextResponse('Errore nel salvataggio', { status: 500 })
  }
}

// PUT /api/clienti?id=X → aggiorna cliente
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

    const before = await prisma.cliente.findUnique({ where: { id } })
    if (!before) return new NextResponse('Cliente non trovato', { status: 404 })

    const updateData: any = {}
    if (has(body, 'nome')) {
      if (!body.nome?.trim()) return new NextResponse('Nome obbligatorio', { status: 400 })
      updateData.nome = body.nome.trim()
    }
    if (has(body, 'cognome')) updateData.cognome = body.cognome?.trim() || null
    if (has(body, 'email')) updateData.email = body.email?.trim() || null
    if (has(body, 'telefono')) updateData.telefono = body.telefono?.trim() || null
    if (has(body, 'telefonoAlt')) updateData.telefonoAlt = body.telefonoAlt?.trim() || null
    if (has(body, 'indirizzo')) updateData.indirizzo = body.indirizzo?.trim() || null
    if (has(body, 'cap')) updateData.cap = body.cap?.trim() || null
    if (has(body, 'citta')) updateData.citta = body.citta?.trim() || null
    if (has(body, 'dataNascita')) updateData.dataNascita = parseDate(body.dataNascita)
    if (has(body, 'codiceFiscale')) updateData.codiceFiscale = body.codiceFiscale?.trim() || null
    if (has(body, 'tipoCliente')) updateData.tipoCliente = body.tipoCliente || null
    if (has(body, 'canalePrimoContatto')) updateData.canalePrimoContatto = body.canalePrimoContatto || null
    if (has(body, 'dataPrimoContatto')) updateData.dataPrimoContatto = parseDate(body.dataPrimoContatto)
    if (has(body, 'secondoContattoNome')) updateData.secondoContattoNome = body.secondoContattoNome?.trim() || null
    if (has(body, 'secondoContattoTelefono')) updateData.secondoContattoTelefono = body.secondoContattoTelefono?.trim() || null
    if (has(body, 'secondoContattoEmail')) updateData.secondoContattoEmail = body.secondoContattoEmail?.trim() || null
    if (has(body, 'notaAnagrafica')) updateData.notaAnagrafica = body.notaAnagrafica?.trim() || null
    if (has(body, 'isSpam')) {
      updateData.isSpam = Boolean(body.isSpam)
      updateData.spamMarkedAt = body.isSpam ? new Date() : null
    }
    if (has(body, 'spamReason')) updateData.spamReason = body.spamReason?.trim() || null

    const cliente = await prisma.cliente.update({ where: { id }, data: updateData })

    await writeAuditLog({
      entityType: 'CLIENT',
      entityId: cliente.id,
      action: 'UPDATE',
      oldValue: before,
      newValue: cliente,
      actor
    })

    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Errore aggiornamento cliente:', error)
    return new NextResponse('Errore aggiornamento', { status: 500 })
  }
}

// DELETE /api/clienti?id=X → elimina cliente
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return new NextResponse('ID mancante', { status: 400 })

    const actor = {
      ...actorFromHeaders(req.headers),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      actorEmail: auth.user.email
    }
    const before = await prisma.cliente.findUnique({ where: { id } })
    if (!before) return new NextResponse('Cliente non trovato', { status: 404 })

    // Rimuovi prima le relazioni evento
    await prisma.eventoCliente.deleteMany({ where: { clienteId: id } })
    await prisma.cliente.delete({ where: { id } })

    await writeAuditLog({
      entityType: 'CLIENT',
      entityId: id,
      action: 'DELETE',
      oldValue: before,
      actor
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Errore eliminazione cliente:', error)
    return new NextResponse('Errore eliminazione', { status: 500 })
  }
}
