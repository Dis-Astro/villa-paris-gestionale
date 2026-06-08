import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dbJsonParse, dbJsonSerialize } from '@/lib/db-json'
import { actorFromHeaders, writeAuditLog } from '@/lib/audit'
import { computeExtraUnlock, computeScadenzaOpzione, normalizeStatoOpzione } from '@/lib/appuntamenti'
import { requireAuth } from '@/lib/auth'
import { syncAppuntamentoToGcal, removeAppuntamentoFromGcal } from '@/lib/google-calendar-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const has = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key)

function toDateOrNull(value: any): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function firstContactDate(value?: any) {
  return toDateOrNull(value) || new Date()
}

function firstContactSummary(canale?: string | null, note?: string | null) {
  const parts = ['Primo contatto registrato']
  if (canale) parts.push(`via ${canale}`)
  if (note) parts.push(`- ${note.trim()}`)
  return parts.join(' ')
}

function parseDateOpzionate(raw: any): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  return dbJsonParse<string[]>(raw, []).filter(Boolean)
}

function normalizeAppuntamentoOut(record: any) {
  return {
    ...record,
    dateOpzionate: parseDateOpzionate(record.dateOpzionate)
  }
}

async function resolveClienti(clientiPayload: any[], fallbackCanale?: string | null, fallbackData?: Date | null) {
  const resolved: Array<{ id: number; ruolo?: string; createFirstContactInteraction?: boolean; firstContactAt?: Date }> = []

  for (const c of clientiPayload || []) {
    if (c.id) {
      const existing = await prisma.cliente.findUnique({ where: { id: Number(c.id) } })
      if (existing && (!existing.dataPrimoContatto || (!existing.canalePrimoContatto && fallbackCanale))) {
        await prisma.cliente.update({
          where: { id: Number(c.id) },
          data: {
            dataPrimoContatto: existing.dataPrimoContatto || fallbackData || new Date(),
            canalePrimoContatto: existing.canalePrimoContatto || fallbackCanale || null
          }
        })
      }
      resolved.push({
        id: Number(c.id),
        ruolo: c.ruolo,
        createFirstContactInteraction: Boolean(existing && !existing.dataPrimoContatto),
        firstContactAt: existing?.dataPrimoContatto || fallbackData || new Date()
      })
      continue
    }

    if (!c.nome?.trim()) continue

    const email = c.email?.trim() || `${c.nome.trim().toLowerCase().replace(/\s+/g, '.')}@villa-paris.local`

    let cliente = await prisma.cliente.findFirst({ where: { email } })
    if (!cliente) {
      const contactAt = toDateOrNull(c.dataPrimoContatto) || fallbackData || new Date()
      cliente = await prisma.cliente.create({
        data: {
          nome: c.nome.trim(),
          cognome: c.cognome?.trim() || null,
          email,
          telefono: c.telefono?.trim() || null,
          tipoCliente: c.tipoCliente || null,
          canalePrimoContatto: fallbackCanale || null,
          dataPrimoContatto: contactAt
        }
      })
      resolved.push({ id: cliente.id, ruolo: c.ruolo, createFirstContactInteraction: true, firstContactAt: contactAt })
      continue
    }

    if (!cliente.dataPrimoContatto || (!cliente.canalePrimoContatto && fallbackCanale)) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: {
          dataPrimoContatto: cliente.dataPrimoContatto || fallbackData || new Date(),
          canalePrimoContatto: cliente.canalePrimoContatto || fallbackCanale || null
        }
      })
    }

    resolved.push({
      id: cliente.id,
      ruolo: c.ruolo,
      createFirstContactInteraction: !cliente.dataPrimoContatto,
      firstContactAt: cliente.dataPrimoContatto || fallbackData || new Date()
    })
  }

  return resolved
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const clienteId = searchParams.get('clienteId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const summary = searchParams.get('summary')

    const where: any = {}
    if (clienteId) where.clientePrincipaleId = Number(clienteId)
    if (from || to) {
      where.dataAppuntamento = {}
      if (from) where.dataAppuntamento.gte = new Date(from)
      if (to) where.dataAppuntamento.lte = new Date(to)
    }

    if (id) {
      const app = await prisma.appuntamento.findUnique({
        where: { id: Number(id) },
        include: {
          clientePrincipale: true,
          clienti: { include: { cliente: true } },
          interazioni: true,
          eventi: { select: { id: true, titolo: true, dataConfermata: true, stato: true } }
        }
      })

      if (!app) return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })

      const count = await prisma.appuntamento.count({ where: { clientePrincipaleId: app.clientePrincipaleId } })
      const sumDurata = await prisma.appuntamento.aggregate({
        where: { clientePrincipaleId: app.clientePrincipaleId },
        _sum: { durataMinuti: true }
      })

      return NextResponse.json({
        ...normalizeAppuntamentoOut(app),
        statsCliente: {
          totaleAppuntamenti: count,
          tempoTotaleDedicatoMin: sumDurata._sum.durataMinuti || 0
        }
      })
    }

    if (summary === 'notifications') {
      const in7Days = addDays(new Date(), 7)
      const list = await prisma.appuntamento.findMany({
        where: {
          dataScadenzaOpzione: {
            lte: in7Days
          },
          NOT: {
            statoOpzione: 'confermata'
          }
        },
        orderBy: { dataScadenzaOpzione: 'asc' },
        take: 20,
        select: {
          id: true,
          dataScadenzaOpzione: true,
          statoOpzione: true,
          clientePrincipale: {
            select: {
              nome: true,
              cognome: true
            }
          }
        }
      })

      return NextResponse.json(list)
    }

    const list = await prisma.appuntamento.findMany({
      where,
      include: {
        clientePrincipale: true,
        clienti: { include: { cliente: true } },
        eventi: { select: { id: true, titolo: true, dataConfermata: true, stato: true } }
      },
      orderBy: [{ dataAppuntamento: 'desc' }, { createdAt: 'desc' }]
    })

    const grouped = await prisma.appuntamento.groupBy({
      by: ['clientePrincipaleId'],
      _count: { _all: true },
      _sum: { durataMinuti: true }
    })
    const mapStats = new Map(grouped.map((g) => [g.clientePrincipaleId, { totaleAppuntamenti: g._count._all, tempoTotaleDedicatoMin: g._sum.durataMinuti || 0 }]))

    return NextResponse.json(
      list.map((item) => ({
        ...normalizeAppuntamentoOut(item),
        statsCliente: mapStats.get(item.clientePrincipaleId) || { totaleAppuntamenti: 0, tempoTotaleDedicatoMin: 0 }
      }))
    )
  } catch (error) {
    console.error('Errore GET appuntamenti:', error)
    return NextResponse.json({ error: 'Errore nel recupero appuntamenti' }, { status: 500 })
  }
}

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

    const dataAppuntamento = toDateOrNull(body.dataAppuntamento)
    if (!dataAppuntamento) {
      return NextResponse.json({ error: 'dataAppuntamento obbligatoria' }, { status: 400 })
    }

    const canale = body.canalePrimoContatto || null
    const contattoAt = firstContactDate(body.dataPrimoContatto)
    const clientiResolved = await resolveClienti(body.clienti || [], canale, contattoAt)

    const clientePrincipaleId = body.clientePrincipaleId
      ? Number(body.clientePrincipaleId)
      : clientiResolved[0]?.id

    if (!clientePrincipaleId) {
      return NextResponse.json({ error: 'Cliente principale obbligatorio' }, { status: 400 })
    }

    const numeroProgressivo = await prisma.appuntamento.count({ where: { clientePrincipaleId } }) + 1
    const dateOpzionate = parseDateOpzionate(body.dateOpzionate)
    const dataScadenza = computeScadenzaOpzione(dataAppuntamento)
    const extraUnlock = body.attivaSbloccoExtra ? computeExtraUnlock(dataScadenza) : null
    const statoOpzione = normalizeStatoOpzione({
      dateOpzionate,
      isConfermata: false,
      extraUnlockFinoAl: extraUnlock
    })

    const created = await prisma.appuntamento.create({
      data: {
        clientePrincipaleId,
        dataAppuntamento,
        durataMinuti: body.durataMinuti ? Number(body.durataMinuti) : 0,
        esito: body.esito || null,
        riassuntoColloquio: body.riassuntoColloquio || null,
        noteColloquio: body.noteColloquio || null,
        numeroProgressivo,
        statoFunnel: body.statoFunnel || 'in_trattativa',
        datiMancanti: body.datiMancanti || null,
        dateOpzionate: dbJsonSerialize(dateOpzionate),
        dataScadenzaOpzione: dateOpzionate.length ? dataScadenza : null,
        extraUnlockFinoAl: extraUnlock,
        statoOpzione,
        operatoreId: body.operatoreId || null,
        clienti: {
          create: (clientiResolved.length ? clientiResolved : [{ id: clientePrincipaleId }]).map((c: any) => ({
            clienteId: c.id,
            ruolo: c.ruolo || null
          }))
        }
      },
      include: {
        clientePrincipale: true,
        clienti: { include: { cliente: true } }
      }
    })

    const interazioniPrimoContatto = clientiResolved
      .filter((cliente) => cliente.createFirstContactInteraction)
      .map((cliente) => ({
        clienteId: cliente.id,
        tipo: 'primo_contatto',
        durataMinuti: 0,
        sintesi: firstContactSummary(canale, body.noteColloquio || body.riassuntoColloquio || null),
        operatoreId: created.operatoreId || null,
        dataInterazione: cliente.firstContactAt || contattoAt
      }))

    if (interazioniPrimoContatto.length) {
      await prisma.interazioneCliente.createMany({ data: interazioniPrimoContatto })
    }

    await prisma.interazioneCliente.create({
      data: {
        clienteId: clientePrincipaleId,
        appuntamentoId: created.id,
        tipo: 'appuntamento',
        durataMinuti: created.durataMinuti || 0,
        sintesi: created.riassuntoColloquio || created.noteColloquio || null,
        operatoreId: created.operatoreId || null,
        dataInterazione: created.dataAppuntamento
      }
    })

    await writeAuditLog({
      entityType: 'APPOINTMENT',
      entityId: created.id,
      action: 'CREATE',
      newValue: normalizeAppuntamentoOut(created),
      actor
    })

    // Sync automatico con Google Calendar
    syncAppuntamentoToGcal(created.id).catch(() => {})

    return NextResponse.json(normalizeAppuntamentoOut(created))
  } catch (error) {
    console.error('Errore POST appuntamento:', error)
    return NextResponse.json({ error: 'Errore nella creazione appuntamento' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'ID appuntamento mancante' }, { status: 400 })

    const body = await req.json()
    const actor = {
      ...actorFromHeaders(req.headers),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      actorEmail: auth.user.email
    }

    const existing = await prisma.appuntamento.findUnique({
      where: { id },
      include: { clienti: true }
    })

    if (!existing) return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })

    const updateData: any = {}

    if (has(body, 'dataAppuntamento')) {
      const dt = toDateOrNull(body.dataAppuntamento)
      if (dt) updateData.dataAppuntamento = dt
    }
    if (has(body, 'durataMinuti')) updateData.durataMinuti = Number(body.durataMinuti || 0)
    if (has(body, 'esito')) updateData.esito = body.esito || null
    if (has(body, 'riassuntoColloquio')) updateData.riassuntoColloquio = body.riassuntoColloquio || null
    if (has(body, 'noteColloquio')) updateData.noteColloquio = body.noteColloquio || null
    if (has(body, 'statoFunnel')) updateData.statoFunnel = body.statoFunnel || null
    if (has(body, 'datiMancanti')) updateData.datiMancanti = body.datiMancanti || null
    if (has(body, 'operatoreId')) updateData.operatoreId = body.operatoreId || null
    if (has(body, 'clientePrincipaleId')) updateData.clientePrincipaleId = Number(body.clientePrincipaleId)

    if (has(body, 'dateOpzionate')) {
      const opzioni = parseDateOpzionate(body.dateOpzionate)
      const baseData = updateData.dataAppuntamento || existing.dataAppuntamento
      const scadenza = computeScadenzaOpzione(baseData)
      const extraUnlock = body.attivaSbloccoExtra
        ? computeExtraUnlock(scadenza)
        : has(body, 'extraUnlockFinoAl')
          ? toDateOrNull(body.extraUnlockFinoAl)
          : existing.extraUnlockFinoAl

      updateData.dateOpzionate = dbJsonSerialize(opzioni)
      updateData.dataScadenzaOpzione = opzioni.length ? scadenza : null
      updateData.extraUnlockFinoAl = extraUnlock
      updateData.statoOpzione = has(body, 'statoOpzione')
        ? body.statoOpzione
        : normalizeStatoOpzione({
            dateOpzionate: opzioni,
            isConfermata: body.statoFunnel === 'confermato' || existing.statoFunnel === 'confermato',
            extraUnlockFinoAl: extraUnlock
          })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.appuntamento.update({
        where: { id },
        data: updateData,
        include: {
          clientePrincipale: true,
          clienti: { include: { cliente: true } },
          interazioni: true,
          eventi: true
        }
      })

      if (Array.isArray(body.clienti)) {
        const resolved = await resolveClienti(body.clienti, null, up.dataAppuntamento)
        await tx.appuntamentoCliente.deleteMany({ where: { appuntamentoId: id } })
        const toCreate = resolved.length ? resolved : [{ id: up.clientePrincipaleId }]
        await tx.appuntamentoCliente.createMany({
          data: toCreate.map((c) => ({ appuntamentoId: id, clienteId: c.id, ruolo: c.ruolo || null }))
        })
      }

      return up
    })

    await writeAuditLog({
      entityType: 'APPOINTMENT',
      entityId: id,
      action: 'UPDATE',
      oldValue: normalizeAppuntamentoOut(existing),
      newValue: normalizeAppuntamentoOut(updated),
      actor
    })

    // Sync automatico con Google Calendar
    syncAppuntamentoToGcal(id).catch(() => {})

    return NextResponse.json(normalizeAppuntamentoOut(updated))
  } catch (error) {
    console.error('Errore PUT appuntamento:', error)
    return NextResponse.json({ error: 'Errore aggiornamento appuntamento' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'ID appuntamento mancante' }, { status: 400 })
    const actor = {
      ...actorFromHeaders(req.headers),
      actorId: auth.user.id,
      actorRole: auth.user.role,
      actorEmail: auth.user.email
    }

    const existing = await prisma.appuntamento.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Appuntamento non trovato' }, { status: 404 })

    // Rimuovi da Google Calendar prima di cancellare
    removeAppuntamentoFromGcal(existing.gcalEventId).catch(() => {})

    await prisma.appuntamento.delete({ where: { id } })

    await writeAuditLog({
      entityType: 'APPOINTMENT',
      entityId: id,
      action: 'DELETE',
      oldValue: normalizeAppuntamentoOut(existing),
      actor
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE appuntamento:', error)
    return NextResponse.json({ error: 'Errore eliminazione appuntamento' }, { status: 500 })
  }
}
