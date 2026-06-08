import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')

function parseStruttura(raw: any) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) } catch { return {} }
  }
  return raw
}

function serializeStruttura(raw: any) {
  const normalized = parseStruttura(raw)
  return isSqlite ? JSON.stringify(normalized) : normalized
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const menu = await prisma.menuBase.findUnique({
        where: { id: Number(id) }
      })
      if (!menu) {
        return NextResponse.json({ error: 'Menù non trovato' }, { status: 404 })
      }
      return NextResponse.json({
        ...menu,
        struttura: parseStruttura(menu.struttura)
      })
    }

    const lista = await prisma.menuBase.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(
      lista.map((m) => ({
        ...m,
        struttura: parseStruttura(m.struttura)
      }))
    )
  } catch (err) {
    console.error('Errore GET menu base:', err)
    return NextResponse.json({ error: 'Errore recupero menù' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const nuovo = await prisma.menuBase.create({
      data: {
        nome: body.nome,
        struttura: serializeStruttura(body.struttura)
      }
    })
    return NextResponse.json({ ...nuovo, struttura: parseStruttura(nuovo.struttura) })
  } catch (err) {
    console.error('Errore POST menu base:', err)
    return NextResponse.json({ error: 'Errore salvataggio menù' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '0')
    await prisma.menuBase.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Errore DELETE menu base:', err)
    return NextResponse.json({ error: 'Errore eliminazione' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT', 'WORKER'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return new NextResponse('ID mancante', { status: 400 })

    const body = await req.json()

    const updated = await prisma.menuBase.update({
      where: { id },
      data: {
        nome: body.nome,
        struttura: serializeStruttura(body.struttura)
      }
    })

    return NextResponse.json({ ...updated, struttura: parseStruttura(updated.struttura) })
  } catch (err) {
    console.error('Errore PUT menu base:', err)
    return NextResponse.json({ error: 'Errore aggiornamento menù' }, { status: 500 })
  }
}
