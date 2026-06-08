import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function toStartOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function toEndOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

function weekRange(reference: Date) {
  const base = new Date(reference)
  const day = base.getDay() === 0 ? 7 : base.getDay()
  const start = new Date(base)
  start.setDate(base.getDate() - day + 1)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toStartOfDay(start), end: toEndOfDay(end) }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const mode = auth.user.role === 'WORKER' ? 'day' : (searchParams.get('mode') === 'week' ? 'week' : 'day')
  const selectedDate = searchParams.get('date') || new Date().toISOString().slice(0, 10)
  const base = new Date(`${selectedDate}T12:00:00`)
  const range = mode === 'week'
    ? weekRange(base)
    : { start: toStartOfDay(base), end: toEndOfDay(base) }

  const items = await prisma.presenzaVilla.findMany({
    where: {
      dataRiferimento: {
        gte: range.start,
        lte: range.end
      }
    },
    include: {
      createdByUser: {
        select: { email: true }
      }
    },
    orderBy: [
      { dataRiferimento: 'asc' },
      { orarioIngresso: 'asc' }
    ]
  })

  return NextResponse.json({
    mode,
    selectedDate,
    from: range.start.toISOString(),
    to: range.end.toISOString(),
    items
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const required = ['dataRiferimento', 'nome', 'cognome', 'azienda', 'orarioIngresso', 'orarioUscita', 'motivoVisita', 'mansioneSvolta']
    for (const field of required) {
      if (!body[field] || `${body[field]}`.trim() === '') {
        return NextResponse.json({ error: `Campo obbligatorio: ${field}` }, { status: 400 })
      }
    }

    const created = await prisma.presenzaVilla.create({
      data: {
        dataRiferimento: toStartOfDay(new Date(`${body.dataRiferimento}T12:00:00`)),
        nome: body.nome.trim(),
        cognome: body.cognome.trim(),
        azienda: body.azienda.trim(),
        orarioIngresso: body.orarioIngresso.trim(),
        orarioUscita: body.orarioUscita.trim(),
        motivoVisita: body.motivoVisita.trim(),
        mansioneSvolta: body.mansioneSvolta.trim(),
        note: body.note?.trim() || null,
        meteo: body.meteo?.trim() || null,
        createdByUserId: auth.user.id
      },
      include: {
        createdByUser: { select: { email: true } }
      }
    })

    await writeAuditLog({
      entityType: 'PRESENZA_VILLA',
      entityId: String(created.id),
      action: 'CREATE',
      newValue: created,
      actor: { actorId: auth.user.id, actorRole: auth.user.role, actorEmail: auth.user.email }
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Errore creazione presenza villa:', error)
    return NextResponse.json({ error: 'Errore creazione presenza in Villa' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const id = Number(searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'ID presenza mancante' }, { status: 400 })

  try {
    const existing = await prisma.presenzaVilla.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Presenza non trovata' }, { status: 404 })

    await prisma.presenzaVilla.delete({ where: { id } })
    await writeAuditLog({
      entityType: 'PRESENZA_VILLA',
      entityId: String(id),
      action: 'DELETE',
      oldValue: existing,
      actor: { actorId: auth.user.id, actorRole: auth.user.role, actorEmail: auth.user.email }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Errore cancellazione presenza villa:', error)
    return NextResponse.json({ error: 'Errore cancellazione presenza in Villa' }, { status: 500 })
  }
}