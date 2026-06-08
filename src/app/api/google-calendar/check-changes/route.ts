import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getActiveConfig, getAuthenticatedClient, getCalendarService } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Controlla modifiche su Google Calendar
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
      return NextResponse.json({ error: 'Impossibile autenticarsi con Google' }, { status: 401 })
    }

    const calendar = getCalendarService(authClient.oauth2Client)
    const calendarId = authClient.calendarId

    let changesDetected = 0

    // Controlla gli eventi sincronizzati
    const eventiConGcal = await prisma.evento.findMany({
      where: { gcalEventId: { not: null } },
      select: { id: true, titolo: true, gcalEventId: true, dataConfermata: true }
    })

    for (const evento of eventiConGcal) {
      if (!evento.gcalEventId) continue
      try {
        const gcalEvent = await calendar.events.get({
          calendarId,
          eventId: evento.gcalEventId
        })

        const data = gcalEvent.data
        // Evento cancellato su Google Calendar
        if (data.status === 'cancelled') {
          const existing = await prisma.googleCalendarChange.findFirst({
            where: { gcalEventId: evento.gcalEventId, stato: 'pending', tipoModifica: 'cancellato' }
          })
          if (!existing) {
            await prisma.googleCalendarChange.create({
              data: {
                gcalEventId: evento.gcalEventId,
                tipoRisorsa: 'evento',
                risorsaId: evento.id,
                tipoModifica: 'cancellato',
                dettagli: JSON.stringify({
                  titolo: evento.titolo,
                  messaggio: `L'evento "${evento.titolo}" e' stato cancellato da Google Calendar`
                }),
                modificatoDa: data.creator?.email || 'Sconosciuto',
                stato: 'pending'
              }
            })
            changesDetected++
          }
          continue
        }

        // Controlla se la data è stata modificata su Google
        const gcalDate = data.start?.date || data.start?.dateTime?.slice(0, 10)
        const localDate = evento.dataConfermata ? new Date(evento.dataConfermata).toISOString().slice(0, 10) : null

        if (gcalDate && localDate && gcalDate !== localDate) {
          const existing = await prisma.googleCalendarChange.findFirst({
            where: { gcalEventId: evento.gcalEventId, stato: 'pending', tipoModifica: 'modificato' }
          })
          if (!existing) {
            await prisma.googleCalendarChange.create({
              data: {
                gcalEventId: evento.gcalEventId,
                tipoRisorsa: 'evento',
                risorsaId: evento.id,
                tipoModifica: 'modificato',
                dettagli: JSON.stringify({
                  titolo: evento.titolo,
                  campo: 'data',
                  vecchioValore: localDate,
                  nuovoValore: gcalDate,
                  messaggio: `La data dell'evento "${evento.titolo}" e' stata modificata su Google Calendar: ${localDate} -> ${gcalDate}`
                }),
                modificatoDa: data.creator?.email || data.organizer?.email || 'Sconosciuto',
                stato: 'pending'
              }
            })
            changesDetected++
          }
        }
      } catch (err: any) {
        if (err.code === 404) {
          // L'evento non esiste più su Google Calendar
          const existing = await prisma.googleCalendarChange.findFirst({
            where: { gcalEventId: evento.gcalEventId!, stato: 'pending', tipoModifica: 'cancellato' }
          })
          if (!existing) {
            await prisma.googleCalendarChange.create({
              data: {
                gcalEventId: evento.gcalEventId!,
                tipoRisorsa: 'evento',
                risorsaId: evento.id,
                tipoModifica: 'cancellato',
                dettagli: JSON.stringify({
                  titolo: evento.titolo,
                  messaggio: `L'evento "${evento.titolo}" e' stato rimosso da Google Calendar`
                }),
                modificatoDa: 'Sconosciuto',
                stato: 'pending'
              }
            })
            changesDetected++
          }
        }
      }
    }

    // Controlla anche gli appuntamenti sincronizzati
    const appConGcal = await prisma.appuntamento.findMany({
      where: { gcalEventId: { not: null } },
      include: { clientePrincipale: { select: { nome: true, cognome: true } } }
    })

    for (const app of appConGcal) {
      if (!app.gcalEventId) continue
      try {
        const gcalEvent = await calendar.events.get({ calendarId, eventId: app.gcalEventId })
        const data = gcalEvent.data

        if (data.status === 'cancelled') {
          const clienteNome = `${app.clientePrincipale?.nome || ''} ${app.clientePrincipale?.cognome || ''}`.trim()
          const existing = await prisma.googleCalendarChange.findFirst({
            where: { gcalEventId: app.gcalEventId, stato: 'pending', tipoModifica: 'cancellato' }
          })
          if (!existing) {
            await prisma.googleCalendarChange.create({
              data: {
                gcalEventId: app.gcalEventId,
                tipoRisorsa: 'appuntamento',
                risorsaId: app.id,
                tipoModifica: 'cancellato',
                dettagli: JSON.stringify({
                  titolo: `Appuntamento con ${clienteNome}`,
                  messaggio: `L'appuntamento con "${clienteNome}" e' stato cancellato da Google Calendar`
                }),
                modificatoDa: data.creator?.email || 'Sconosciuto',
                stato: 'pending'
              }
            })
            changesDetected++
          }
        }
      } catch (err: any) {
        if (err.code === 404) {
          const clienteNome = `${app.clientePrincipale?.nome || ''} ${app.clientePrincipale?.cognome || ''}`.trim()
          const existing = await prisma.googleCalendarChange.findFirst({
            where: { gcalEventId: app.gcalEventId!, stato: 'pending', tipoModifica: 'cancellato' }
          })
          if (!existing) {
            await prisma.googleCalendarChange.create({
              data: {
                gcalEventId: app.gcalEventId!,
                tipoRisorsa: 'appuntamento',
                risorsaId: app.id,
                tipoModifica: 'cancellato',
                dettagli: JSON.stringify({
                  titolo: `Appuntamento con ${clienteNome}`,
                  messaggio: `L'appuntamento con "${clienteNome}" e' stato rimosso da Google Calendar`
                }),
                modificatoDa: 'Sconosciuto',
                stato: 'pending'
              }
            })
            changesDetected++
          }
        }
      }
    }

    return NextResponse.json({ success: true, changesDetected })
  } catch (error: any) {
    console.error('Errore check modifiche GCal:', error)
    return NextResponse.json({ error: error.message || 'Errore durante il controllo modifiche' }, { status: 500 })
  }
}
