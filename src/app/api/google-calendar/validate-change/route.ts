import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveConfig, getAuthenticatedClient, getCalendarService, buildCalendarEvent } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Valida o rifiuta una modifica esterna
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const { changeId, azione } = body // azione: 'accetta' | 'rifiuta'

    if (!changeId || !['accetta', 'rifiuta'].includes(azione)) {
      return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 })
    }

    const change = await prisma.googleCalendarChange.findUnique({ where: { id: changeId } })
    if (!change) {
      return NextResponse.json({ error: 'Modifica non trovata' }, { status: 404 })
    }

    if (change.stato !== 'pending') {
      return NextResponse.json({ error: 'Modifica gia\' gestita' }, { status: 400 })
    }

    const dettagli = change.dettagli ? JSON.parse(change.dettagli) : {}

    if (azione === 'accetta') {
      // Applica la modifica nel DB locale
      if (change.tipoModifica === 'cancellato' && change.risorsaId) {
        if (change.tipoRisorsa === 'evento') {
          await prisma.evento.update({
            where: { id: change.risorsaId },
            data: { stato: 'cancellato', gcalEventId: null }
          })
        } else if (change.tipoRisorsa === 'appuntamento') {
          // Non cancella l'appuntamento, ma rimuove il link GCal
          await prisma.appuntamento.update({
            where: { id: change.risorsaId },
            data: { gcalEventId: null }
          })
        }
      } else if (change.tipoModifica === 'modificato' && change.risorsaId && dettagli.campo === 'data') {
        if (change.tipoRisorsa === 'evento') {
          await prisma.evento.update({
            where: { id: change.risorsaId },
            data: { dataConfermata: new Date(dettagli.nuovoValore) }
          })
        }
      }

      await prisma.googleCalendarChange.update({
        where: { id: changeId },
        data: { stato: 'accettato', validatoDa: auth.user.email, validatoAt: new Date() }
      })
    } else {
      // Rifiuta: ripristina su Google Calendar
      if (change.risorsaId && change.tipoModifica === 'cancellato') {
        // Ricrea l'evento su Google Calendar
        const config = await getActiveConfig()
        if (config) {
          const authClient = await getAuthenticatedClient(config.userId)
          if (authClient) {
            const calendar = getCalendarService(authClient.oauth2Client)
            if (change.tipoRisorsa === 'evento') {
              const evento = await prisma.evento.findUnique({ where: { id: change.risorsaId } })
              if (evento) {
                const calEvent = buildCalendarEvent('evento', evento)
                if (calEvent) {
                  const created = await calendar.events.insert({
                    calendarId: authClient.calendarId,
                    requestBody: calEvent
                  })
                  await prisma.evento.update({
                    where: { id: evento.id },
                    data: { gcalEventId: created.data.id }
                  })
                }
              }
            } else if (change.tipoRisorsa === 'appuntamento') {
              const app = await prisma.appuntamento.findUnique({
                where: { id: change.risorsaId },
                include: { clientePrincipale: { select: { nome: true, cognome: true } } }
              })
              if (app) {
                const calEvent = buildCalendarEvent('appuntamento', app)
                if (calEvent) {
                  const created = await calendar.events.insert({
                    calendarId: authClient.calendarId,
                    requestBody: calEvent
                  })
                  await prisma.appuntamento.update({
                    where: { id: app.id },
                    data: { gcalEventId: created.data.id }
                  })
                }
              }
            }
          }
        }
      } else if (change.risorsaId && change.tipoModifica === 'modificato' && dettagli.campo === 'data') {
        // Ripristina la data originale su Google Calendar
        const config = await getActiveConfig()
        if (config) {
          const authClient = await getAuthenticatedClient(config.userId)
          if (authClient) {
            const calendar = getCalendarService(authClient.oauth2Client)
            if (change.tipoRisorsa === 'evento') {
              const evento = await prisma.evento.findUnique({ where: { id: change.risorsaId } })
              if (evento) {
                const calEvent = buildCalendarEvent('evento', evento)
                if (calEvent && evento.gcalEventId) {
                  await calendar.events.update({
                    calendarId: authClient.calendarId,
                    eventId: evento.gcalEventId,
                    requestBody: calEvent
                  })
                }
              }
            }
          }
        }
      }

      await prisma.googleCalendarChange.update({
        where: { id: changeId },
        data: { stato: 'rifiutato', validatoDa: auth.user.email, validatoAt: new Date() }
      })
    }

    return NextResponse.json({ success: true, azione })
  } catch (error: any) {
    console.error('Errore validazione modifica GCal:', error)
    return NextResponse.json({ error: error.message || 'Errore durante la validazione' }, { status: 500 })
  }
}
