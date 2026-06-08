import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dbJsonParse } from '@/lib/db-json'
import { requireAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const limit = Number(searchParams.get('limit') || 200)

    const where: any = {}
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = String(entityId)

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500)
    })

    return NextResponse.json(logs.map((l) => ({
      ...l,
      changedFields: dbJsonParse(l.changedFields, l.changedFields),
      oldValue: dbJsonParse(l.oldValue, l.oldValue),
      newValue: dbJsonParse(l.newValue, l.newValue),
      metadata: dbJsonParse(l.metadata, l.metadata)
    })))
  } catch (error) {
    console.error('Errore GET audit:', error)
    return NextResponse.json({ error: 'Errore nel recupero audit log' }, { status: 500 })
  }
}
