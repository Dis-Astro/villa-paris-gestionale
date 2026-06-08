import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword, requireAuth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const email = body.email?.trim()?.toLowerCase()
    const password = body.password || ''
    const role = body.role || 'WORKER'

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password obbligatorie' }, { status: 400 })
    }
    if (!['ADMIN', 'REPORT', 'WORKER'].includes(role)) {
      return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email già presente' }, { status: 409 })
    }

    const created = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    await writeAuditLog({
      entityType: 'USER',
      entityId: created.id,
      action: 'CREATE',
      newValue: created,
      actor: { actorId: auth.user.id, actorRole: auth.user.role, actorEmail: auth.user.email }
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Errore POST users:', error)
    return NextResponse.json({ error: 'Errore creazione utente' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'ID utente mancante' }, { status: 400 })

    const before = await prisma.user.findUnique({ where: { id } })
    if (!before) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

    const data: any = {}
    if (body.role) {
      if (!['ADMIN', 'REPORT', 'WORKER'].includes(body.role)) {
        return NextResponse.json({ error: 'Ruolo non valido' }, { status: 400 })
      }
      data.role = body.role
    }
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (body.newPassword) data.passwordHash = hashPassword(body.newPassword)

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    })

    await writeAuditLog({
      entityType: 'USER',
      entityId: id,
      action: 'UPDATE',
      oldValue: before,
      newValue: updated,
      actor: { actorId: auth.user.id, actorRole: auth.user.role, actorEmail: auth.user.email }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Errore PATCH users:', error)
    return NextResponse.json({ error: 'Errore aggiornamento utente' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'ID utente mancante' }, { status: 400 })
    if (id === auth.user.id) {
      return NextResponse.json({ error: 'Non puoi eliminare il tuo account mentre sei loggato' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            appuntamentiGestiti: true,
            interazioniGestite: true,
            auditLogs: true,
            presenzeRegistrate: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Non puoi eliminare l’ultimo Admin' }, { status: 400 })
      }
    }

    const linkedRecords = user._count.appuntamentiGestiti + user._count.interazioniGestite + user._count.auditLogs + user._count.presenzeRegistrate
    if (linkedRecords > 0) {
      return NextResponse.json({ error: 'Utente con dati collegati: usa Disattiva invece di Elimina' }, { status: 409 })
    }

    await prisma.user.delete({ where: { id } })

    await writeAuditLog({
      entityType: 'USER',
      entityId: id,
      action: 'DELETE',
      oldValue: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      actor: { actorId: auth.user.id, actorRole: auth.user.role, actorEmail: auth.user.email }
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Errore DELETE users:', error)
    return NextResponse.json({ error: 'Errore eliminazione utente' }, { status: 500 })
  }
}
