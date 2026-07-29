import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function historyDir() {
  return path.resolve(process.env.HISTORY_DIR || path.join(process.cwd(), 'storage', 'history'))
}

function cutoff(raw: string | null) {
  const fallback = `${new Date().getFullYear()}-01-01`
  const value = raw || fallback
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data limite non valida')
  const date = new Date(`${value}T00:00:00+01:00`)
  if (Number.isNaN(date.getTime()) || date > new Date()) throw new Error('La data limite deve essere nel passato')
  return { value, date }
}

function isRestaurantRecord(record: any) {
  const text = [
    record.titolo,
    record.tipo,
    record.note,
    record.riassuntoColloquio,
    record.noteColloquio,
    record.tipoEventoRichiesto,
    record.clientePrincipale?.nome,
    record.clientePrincipale?.cognome
  ].filter(Boolean).join(' ').toLowerCase()
  return /\bristorante\b/.test(text)
}

async function collect(before: Date) {
  const [allEvents, allAppointments] = await Promise.all([
    prisma.evento.findMany({
      where: { dataConfermata: { lt: before } },
      include: {
        clienti: { include: { cliente: true } },
        versioni: true,
        overrideLogs: true
      },
      orderBy: { dataConfermata: 'asc' }
    }),
    prisma.appuntamento.findMany({
      where: { dataAppuntamento: { lt: before } },
      include: {
        clientePrincipale: true,
        clienti: { include: { cliente: true } },
        interazioni: true
      },
      orderBy: { dataAppuntamento: 'asc' }
    })
  ])
  const eventi = allEvents.filter((item) => !isRestaurantRecord(item))
  const appuntamenti = allAppointments.filter((item) => !isRestaurantRecord(item))
  return {
    eventi,
    appuntamenti,
    excludedRestaurant: (allEvents.length - eventi.length) + (allAppointments.length - appuntamenti.length)
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const filename = req.nextUrl.searchParams.get('file')
    if (filename) {
      if (!/^villa-paris-storico-\d{4}-\d{2}-\d{2}-\d+\.json$/.test(filename)) {
        throw new Error('Nome archivio non valido')
      }
      const root = historyDir()
      const absolute = path.resolve(root, filename)
      if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error('Percorso archivio non valido')
      const bytes = await readFile(absolute)
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, no-store'
        }
      })
    }

    const limit = cutoff(req.nextUrl.searchParams.get('before'))
    const records = await collect(limit.date)
    if (req.nextUrl.searchParams.get('download') === '1') {
      const snapshot = JSON.stringify({
        versione: 1,
        anteprima: true,
        generatoIl: new Date().toISOString(),
        limiteEsclusivo: limit.value,
        esclusiRistorante: records.excludedRestaurant,
        eventi: records.eventi,
        appuntamenti: records.appuntamenti
      }, null, 2)
      return new NextResponse(snapshot, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="villa-paris-anteprima-storico-${limit.value}.json"`,
          'Cache-Control': 'private, no-store'
        }
      })
    }
    return NextResponse.json({
      before: limit.value,
      eventi: records.eventi.length,
      appuntamenti: records.appuntamenti.length,
      esclusiRistorante: records.excludedRestaurant,
      destructive: false
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore anteprima storico' }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const body = await req.json()
    if (body.confirm !== 'ARCHIVIA_STORICO') throw new Error('Conferma archivio non valida')
    const limit = cutoff(typeof body.before === 'string' ? body.before : null)
    const records = await collect(limit.date)
    if (!records.eventi.length && !records.appuntamenti.length) throw new Error('Nessun record da archiviare')

    const filename = `villa-paris-storico-${limit.value}-${Date.now()}.json`
    const root = historyDir()
    await mkdir(root, { recursive: true })
    await writeFile(path.join(root, filename), JSON.stringify({
      versione: 1,
      generatoIl: new Date().toISOString(),
      generatoDa: auth.user.email,
      limiteEsclusivo: limit.value,
      esclusiRistorante: records.excludedRestaurant,
      eventi: records.eventi,
      appuntamenti: records.appuntamenti
    }, null, 2), 'utf8')

    const eventIds = records.eventi.map((item) => item.id)
    const appointmentIds = records.appuntamenti.map((item) => item.id)
    const eventGcalIds = records.eventi.map((item) => item.gcalEventId).filter((id): id is string => Boolean(id))
    const appointmentGcalIds = records.appuntamenti.map((item) => item.gcalEventId).filter((id): id is string => Boolean(id))

    await prisma.$transaction(async (tx) => {
      if (appointmentIds.length) {
        await tx.interazioneCliente.deleteMany({ where: { appuntamentoId: { in: appointmentIds } } })
        await tx.appuntamento.deleteMany({ where: { id: { in: appointmentIds } } })
      }
      if (eventIds.length) await tx.evento.deleteMany({ where: { id: { in: eventIds } } })
      const gcalIds = [...eventGcalIds, ...appointmentGcalIds]
      if (gcalIds.length) {
        await tx.googleCalendarImport.updateMany({
          where: { gcalEventId: { in: gcalIds } },
          data: {
            stato: 'archived_file',
            risorsaId: null,
            warning: `Archiviato nel file ${filename}`,
            aiStatus: 'not_required'
          }
        })
      }
    })

    return NextResponse.json({
      success: true,
      file: filename,
      downloadUrl: `/api/storico?file=${encodeURIComponent(filename)}`,
      removed: { eventi: eventIds.length, appuntamenti: appointmentIds.length },
      esclusiRistorante: records.excludedRestaurant
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore creazione storico' }, { status: 400 })
  }
}
