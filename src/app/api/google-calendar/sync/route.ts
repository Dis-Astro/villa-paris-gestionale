import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveConfig, getAuthenticatedClient, getCalendarService, buildCalendarEvent } from '@/lib/google-calendar'
import { dbJsonParse } from '@/lib/db-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseDateProposte(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') return dbJsonParse<string[]>(value, []).filter(Boolean)
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return []
}

// GET - Status della connessione + lista cambiamenti pendenti
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const config = await getActiveConfig()
    const pendingChanges = await prisma.googleCalendarChange.findMany({
      where: { stato: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({
      connected: !!config,
      config: config ? {
        connectedAt: config.connectedAt,
        lastSyncAt: config.lastSyncAt,
        calendarId: config.calendarId,
        userEmail: config.user?.email
      } : null,
      pendingChanges
    })
  } catch (error: any) {
    console.error('Errore status GCal:', error)
    return NextResponse.json({ error: 'Errore nel recupero stato' }, { status: 500 })
  }
}

// POST - Sincronizzazione completa
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const config = await getActiveConfig()
    if (!config) {
      return NextResponse.json({ error: 'Google Calendar non connesso' }, { status: 400 })
    }

    const authClient = await getAuthenticatedClient(config.userId)
    if (!authClient) {
      return NextResponse.json({ error: 'Token scaduto. Clicca "Riconnetti" per riautenticarti.' }, { status: 401 })
    }

    const calendar = getCalendarService(authClient.oauth2Client)
    const calendarId = authClient.calendarId
    const synced = { eventi: 0, appuntamenti: 0, aggiornati: 0, errori: 0, skipped: 0 }
    const erroriDettaglio: string[] = []

    // === 1) EVENTI ===
    const eventi = await prisma.evento.findMany()
    console.log(`[GCal Sync] Inizio sync: ${eventi.length} eventi totali`)

    for (const evento of eventi) {
      try {
        // Parsa dateProposte (stringa JSON in SQLite)
        const dateProposte = parseDateProposte(evento.dateProposte)
        const eventoData = { ...evento, dateProposte }
        const calEvent = buildCalendarEvent('evento', eventoData)

        if (!calEvent) {
          synced.skipped++
          continue
        }

        if (evento.gcalEventId) {
          // Aggiorna esistente
          try {
            await calendar.events.update({
              calendarId,
              eventId: evento.gcalEventId,
              requestBody: calEvent
            })
            synced.aggiornati++
            continue
          } catch (e: any) {
            if (e.code === 404 || e.status === 404) {
              console.log(`[GCal Sync] Evento GCal ${evento.gcalEventId} non trovato, ricreo #${evento.id}`)
              // Fallthrough per ricreare
            } else {
              const msg = `Evento #${evento.id} "${evento.titolo}": ${e.message || e.toString()}`
              console.error(`[GCal Sync] ${msg}`)
              erroriDettaglio.push(msg)
              synced.errori++
              continue
            }
          }
        }

        // Crea nuovo su GCal
        const created = await calendar.events.insert({ calendarId, requestBody: calEvent })
        if (created.data.id) {
          await prisma.evento.update({
            where: { id: evento.id },
            data: { gcalEventId: created.data.id }
          })
          console.log(`[GCal Sync] Evento #${evento.id} "${evento.titolo}" -> GCal ${created.data.id}`)
        }
        synced.eventi++
      } catch (err: any) {
        const msg = `Evento #${evento.id} "${evento.titolo}": ${err.message || err.toString()}`
        console.error(`[GCal Sync] ERRORE: ${msg}`)
        erroriDettaglio.push(msg)
        synced.errori++
      }
    }

    // === 2) APPUNTAMENTI ===
    const appuntamenti = await prisma.appuntamento.findMany({
      include: { clientePrincipale: { select: { nome: true, cognome: true } } }
    })
    console.log(`[GCal Sync] Sync: ${appuntamenti.length} appuntamenti totali`)

    for (const app of appuntamenti) {
      try {
        const calEvent = buildCalendarEvent('appuntamento', app)
        if (!calEvent) { synced.skipped++; continue }

        if (app.gcalEventId) {
          try {
            await calendar.events.update({
              calendarId,
              eventId: app.gcalEventId,
              requestBody: calEvent
            })
            synced.aggiornati++
            continue
          } catch (e: any) {
            if (e.code === 404 || e.status === 404) {
              console.log(`[GCal Sync] Appuntamento GCal ${app.gcalEventId} non trovato, ricreo #${app.id}`)
            } else {
              const msg = `Appuntamento #${app.id}: ${e.message || e.toString()}`
              console.error(`[GCal Sync] ${msg}`)
              erroriDettaglio.push(msg)
              synced.errori++
              continue
            }
          }
        }

        const created = await calendar.events.insert({ calendarId, requestBody: calEvent })
        if (created.data.id) {
          await prisma.appuntamento.update({
            where: { id: app.id },
            data: { gcalEventId: created.data.id }
          })
        }
        synced.appuntamenti++
      } catch (err: any) {
        const msg = `Appuntamento #${app.id}: ${err.message || err.toString()}`
        console.error(`[GCal Sync] ERRORE: ${msg}`)
        erroriDettaglio.push(msg)
        synced.errori++
      }
    }

    // Aggiorna lastSyncAt
    await prisma.googleCalendarConfig.update({
      where: { id: config.id },
      data: { lastSyncAt: new Date() }
    })

    console.log(`[GCal Sync] COMPLETATO: eventi=${synced.eventi}, appuntamenti=${synced.appuntamenti}, aggiornati=${synced.aggiornati}, errori=${synced.errori}, skipped=${synced.skipped}`)

    return NextResponse.json({
      success: true,
      synced,
      erroriDettaglio: erroriDettaglio.length > 0 ? erroriDettaglio.slice(0, 10) : undefined
    })
  } catch (error: any) {
    console.error('[GCal Sync] ERRORE FATALE:', error)
    return NextResponse.json({ error: error.message || 'Errore durante la sincronizzazione' }, { status: 500 })
  }
}

// DELETE - Disconnetti Google Calendar
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const config = await getActiveConfig()
    if (config) {
      await prisma.googleCalendarConfig.update({
        where: { id: config.id },
        data: { isActive: false }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Errore disconnessione GCal:', error)
    return NextResponse.json({ error: 'Errore durante la disconnessione' }, { status: 500 })
  }
}
