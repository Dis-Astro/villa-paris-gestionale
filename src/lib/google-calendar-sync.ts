import { getActiveConfig, getAuthenticatedClient, getCalendarService, buildCalendarEvent } from '@/lib/google-calendar'
import prisma from '@/lib/prisma'
import { dbJsonParse } from '@/lib/db-json'

async function getCalendarOrNull() {
  try {
    const config = await getActiveConfig()
    if (!config) return null

    const authClient = await getAuthenticatedClient(config.userId)
    if (!authClient) return null

    const calendar = getCalendarService(authClient.oauth2Client)
    return { calendar, calendarId: authClient.calendarId }
  } catch {
    return null
  }
}

export async function syncEventoToGcal(eventoId: number) {
  try {
    const gcal = await getCalendarOrNull()
    if (!gcal) return

    const evento = await prisma.evento.findUnique({ where: { id: eventoId } })
    if (!evento) return

    // Parsa dateProposte (stringa JSON in SQLite)
    const eventoData = {
      ...evento,
      dateProposte: typeof evento.dateProposte === 'string'
        ? dbJsonParse(evento.dateProposte, [])
        : (evento.dateProposte || [])
    }
    const calEvent = buildCalendarEvent('evento', eventoData)

    if (!calEvent) {
      // Nessuna data confermata: rimuovi da GCal se esisteva
      if (evento.gcalEventId) {
        try { await gcal.calendar.events.delete({ calendarId: gcal.calendarId, eventId: evento.gcalEventId }) } catch {}
        await prisma.evento.update({ where: { id: eventoId }, data: { gcalEventId: null } })
      }
      return
    }

    if (evento.gcalEventId) {
      // Aggiorna evento esistente su Google Calendar
      try {
        await gcal.calendar.events.update({
          calendarId: gcal.calendarId,
          eventId: evento.gcalEventId,
          requestBody: calEvent
        })
        console.log(`[GCal] Evento #${eventoId} aggiornato su GCal (${evento.gcalEventId})`)
        return
      } catch (e: any) {
        if (e.code === 404 || e.status === 404) {
          // L'evento è stato cancellato su Google, ricrealo
          console.log(`[GCal] Evento GCal ${evento.gcalEventId} non trovato, ricreo...`)
        } else {
          console.error(`[GCal] Errore update evento #${eventoId}:`, e.message)
          return
        }
      }
    }

    // Crea nuovo evento su Google Calendar
    const created = await gcal.calendar.events.insert({
      calendarId: gcal.calendarId,
      requestBody: calEvent
    })
    if (created.data.id) {
      await prisma.evento.update({ where: { id: eventoId }, data: { gcalEventId: created.data.id } })
      console.log(`[GCal] Evento #${eventoId} creato su GCal: ${created.data.id}`)
    }
  } catch (err: any) {
    console.error(`[GCal] Errore sync evento #${eventoId}:`, err.message)
  }
}

export async function syncAppuntamentoToGcal(appuntamentoId: number) {
  try {
    const gcal = await getCalendarOrNull()
    if (!gcal) return

    const app = await prisma.appuntamento.findUnique({
      where: { id: appuntamentoId },
      include: { clientePrincipale: { select: { nome: true, cognome: true } } }
    })
    if (!app) return

    const calEvent = buildCalendarEvent('appuntamento', app)
    if (!calEvent) return

    if (app.gcalEventId) {
      // Aggiorna appuntamento esistente
      try {
        await gcal.calendar.events.update({
          calendarId: gcal.calendarId,
          eventId: app.gcalEventId,
          requestBody: calEvent
        })
        console.log(`[GCal] Appuntamento #${appuntamentoId} aggiornato su GCal (${app.gcalEventId})`)
        return
      } catch (e: any) {
        if (e.code === 404 || e.status === 404) {
          console.log(`[GCal] Appuntamento GCal ${app.gcalEventId} non trovato, ricreo...`)
        } else {
          console.error(`[GCal] Errore update appuntamento #${appuntamentoId}:`, e.message)
          return
        }
      }
    }

    // Crea nuovo
    const created = await gcal.calendar.events.insert({
      calendarId: gcal.calendarId,
      requestBody: calEvent
    })
    if (created.data.id) {
      await prisma.appuntamento.update({ where: { id: appuntamentoId }, data: { gcalEventId: created.data.id } })
      console.log(`[GCal] Appuntamento #${appuntamentoId} creato su GCal: ${created.data.id}`)
    }
  } catch (err: any) {
    console.error(`[GCal] Errore sync appuntamento #${appuntamentoId}:`, err.message)
  }
}

export async function removeEventoFromGcal(gcalEventId: string | null) {
  if (!gcalEventId) return
  try {
    const gcal = await getCalendarOrNull()
    if (!gcal) return
    await gcal.calendar.events.delete({ calendarId: gcal.calendarId, eventId: gcalEventId })
    console.log(`[GCal] Evento GCal ${gcalEventId} rimosso`)
  } catch (err: any) {
    // 404/410 = già cancellato, va bene
    if (err.code !== 404 && err.code !== 410 && err.status !== 404 && err.status !== 410) {
      console.error(`[GCal] Errore rimozione evento GCal ${gcalEventId}:`, err.message)
    }
  }
}

export async function removeAppuntamentoFromGcal(gcalEventId: string | null) {
  if (!gcalEventId) return
  try {
    const gcal = await getCalendarOrNull()
    if (!gcal) return
    await gcal.calendar.events.delete({ calendarId: gcal.calendarId, eventId: gcalEventId })
    console.log(`[GCal] Appuntamento GCal ${gcalEventId} rimosso`)
  } catch (err: any) {
    if (err.code !== 404 && err.code !== 410 && err.status !== 404 && err.status !== 410) {
      console.error(`[GCal] Errore rimozione appuntamento GCal ${gcalEventId}:`, err.message)
    }
  }
}
