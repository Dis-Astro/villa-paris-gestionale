import { google } from 'googleapis'
import prisma from '@/lib/prisma'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

function getRedirectUri() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/oauth/google-calendar/callback`
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, getRedirectUri())
}

export function getAuthUrl() {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar']
  })
}

export async function getAuthenticatedClient(userId: string) {
  const config = await prisma.googleCalendarConfig.findUnique({ where: { userId } })
  if (!config || !config.isActive) return null

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: config.accessToken,
    refresh_token: config.refreshToken,
    expiry_date: config.tokenExpiry ? config.tokenExpiry.getTime() : undefined
  })

  // Se il token è scaduto o sta per scadere, refresh esplicito
  const now = Date.now()
  const expiry = config.tokenExpiry ? config.tokenExpiry.getTime() : 0
  if (expiry > 0 && expiry - now < 5 * 60 * 1000) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      const updateData: any = {}
      if (credentials.access_token) updateData.accessToken = credentials.access_token
      if (credentials.expiry_date) updateData.tokenExpiry = new Date(credentials.expiry_date)
      if (credentials.refresh_token) updateData.refreshToken = credentials.refresh_token
      if (Object.keys(updateData).length > 0) {
        await prisma.googleCalendarConfig.update({ where: { userId }, data: updateData })
      }
      oauth2Client.setCredentials(credentials)
    } catch (err: any) {
      console.error('[GCal] Errore refresh token:', err.message)
      // Se il refresh fallisce con invalid_grant, disattiva la connessione
      if (err.message?.includes('invalid_grant') || err.response?.data?.error === 'invalid_grant') {
        await prisma.googleCalendarConfig.update({ where: { userId }, data: { isActive: false } })
        return null
      }
    }
  }

  // Listener per eventuali refresh automatici durante le chiamate API
  oauth2Client.on('tokens', async (tokens) => {
    try {
      const updateData: any = {}
      if (tokens.access_token) updateData.accessToken = tokens.access_token
      if (tokens.expiry_date) updateData.tokenExpiry = new Date(tokens.expiry_date)
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token
      if (Object.keys(updateData).length > 0) {
        await prisma.googleCalendarConfig.update({ where: { userId }, data: updateData })
      }
    } catch (e) {
      console.error('[GCal] Errore salvataggio token aggiornato:', e)
    }
  })

  return { oauth2Client, calendarId: config.calendarId || 'primary' }
}

export function getCalendarService(oauth2Client: any) {
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// Colori Google Calendar per tipo evento
const COLORI_TIPO: Record<string, string> = {
  matrimonio: '11',
  battesimo: '9',
  comunione: '5',
  cresima: '10',
  compleanno: '6',
  aziendale: '7',
  altro: '8',
}

// Calcola il giorno successivo (per end date eventi tutto il giorno)
function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export function buildCalendarEvent(
  tipo: 'evento' | 'appuntamento' | 'opzione',
  data: any
) {
  if (tipo === 'evento') {
    const colorId = COLORI_TIPO[data.tipo?.toLowerCase()] || '8'
    const isConfermato = !!data.dataConfermata
    
    // Determina la data dell'evento: dataConfermata > prima dateProposte
    let eventDate: Date | null = null
    if (data.dataConfermata) {
      eventDate = new Date(data.dataConfermata)
    } else if (data.dateProposte && Array.isArray(data.dateProposte) && data.dateProposte.length > 0) {
      eventDate = new Date(data.dateProposte[0])
    }
    
    if (!eventDate || isNaN(eventDate.getTime())) return null

    const statoLabel = isConfermato ? 'CONFERMATO' : (data.stato || 'in_attesa').toUpperCase()
    const prefix = isConfermato ? '[EVENTO]' : '[EVENTO - ' + statoLabel + ']'
    const summary = `${prefix} ${data.titolo || 'Evento'}`
    const description = [
      `Tipo: ${data.tipo || 'N/D'}`,
      `Stato: ${data.stato || 'N/D'}`,
      !isConfermato ? `Data proposta (non confermata)` : `Data confermata`,
      data.personePreviste ? `Invitati: ${data.personePreviste}` : null,
      data.fascia ? `Fascia: ${data.fascia}` : null,
      data.luogo ? `Luogo: ${data.luogo}` : null,
      data.note ? `Note: ${data.note}` : null,
      `---`,
      `Villa Paris Gestionale (ID: ${data.id || ''})`
    ].filter(Boolean).join('\n')

    const dateStr = eventDate.toISOString().slice(0, 10)
    return {
      summary,
      description,
      colorId,
      start: { date: dateStr },
      end: { date: nextDay(dateStr) },
    }
  }

  if (tipo === 'appuntamento') {
    if (!data.dataAppuntamento) return null
    const date = new Date(data.dataAppuntamento)
    if (isNaN(date.getTime())) return null
    const durata = data.durataMinuti || 60
    const endDate = new Date(date.getTime() + durata * 60 * 1000)
    const clienteNome = data.clientePrincipale
      ? `${data.clientePrincipale.nome || ''} ${data.clientePrincipale.cognome || ''}`.trim()
      : 'Cliente'

    return {
      summary: `[APPUNTAMENTO] ${clienteNome}`,
      description: [
        `Stato funnel: ${data.statoFunnel || 'N/D'}`,
        data.esito ? `Esito: ${data.esito}` : null,
        data.noteColloquio ? `Note: ${data.noteColloquio}` : null,
        `---`,
        `Villa Paris Gestionale (ID: ${data.id || ''})`
      ].filter(Boolean).join('\n'),
      colorId: '3',
      start: { dateTime: date.toISOString(), timeZone: 'Europe/Rome' },
      end: { dateTime: endDate.toISOString(), timeZone: 'Europe/Rome' },
    }
  }

  if (tipo === 'opzione') {
    if (!data.dataOpzionata) return null
    const dateStr = new Date(data.dataOpzionata).toISOString().slice(0, 10)
    return {
      summary: `[OPZIONE] Data opzionata - ${data.clienteNome || 'N/D'}`,
      description: `Data opzionata per potenziale evento.\nScadenza opzione: ${data.dataScadenza || 'N/D'}\n---\nVilla Paris Gestionale`,
      colorId: '5',
      start: { date: dateStr },
      end: { date: nextDay(dateStr) },
    }
  }

  return null
}

export async function getActiveConfig() {
  return prisma.googleCalendarConfig.findFirst({
    where: { isActive: true },
    include: { user: { select: { email: true } } }
  })
}
