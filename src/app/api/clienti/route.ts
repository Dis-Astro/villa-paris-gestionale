import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: Number(id) },
        include: {
          eventi: {
            include: {
              evento: true
            }
          }
        }
      })

      if (!cliente) {
        return new NextResponse('Cliente non trovato', { status: 404 })
      }

      return NextResponse.json(cliente)
    }

    const clienti = await prisma.cliente.findMany({
      include: {
        eventi: { select: { id: true } }
      },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(clienti)

  } catch (error) {
    console.error('Errore nel recupero clienti:', error)
    return new NextResponse('Errore durante il recupero dei clienti', { status: 500 })
  }
}
