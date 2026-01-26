import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
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
      return NextResponse.json(menu)
    }

    const lista = await prisma.menuBase.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(lista)
  } catch (err) {
    console.error('Errore GET menu base:', err)
    return NextResponse.json({ error: 'Errore recupero menù' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const nuovo = await prisma.menuBase.create({
      data: {
        nome: body.nome,
        struttura: body.contenuto
      }
    })
    return NextResponse.json(nuovo)
  } catch (err) {
    console.error('Errore POST menu base:', err)
    return NextResponse.json({ error: 'Errore salvataggio menù' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
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

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    if (!id) return new NextResponse('ID mancante', { status: 400 })

    const body = await req.json()

    const updated = await prisma.menuBase.update({
      where: { id },
      data: {
        struttura: body.struttura
      }
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Errore PUT menu base:', err)
    return NextResponse.json({ error: 'Errore aggiornamento menù' }, { status: 500 })
  }
}
