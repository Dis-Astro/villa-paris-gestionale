import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import {
  analyzeCalendarImportWithAI,
  getAIConfig,
  processPendingAIEnhancements,
  reviewAIOperation
} from '@/lib/ai-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const config = getAIConfig()
  const [operations, pendingReview, failed] = await Promise.all([
    prisma.aiOperation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        operationType: true,
        status: true,
        provider: true,
        model: true,
        proposedChanges: true,
        appliedChanges: true,
        confidence: true,
        requiresReview: true,
        error: true,
        createdAt: true,
        completedAt: true
      }
    }),
    prisma.aiOperation.count({ where: { status: 'review' } }),
    prisma.aiOperation.count({ where: { status: 'failed' } })
  ])
  return NextResponse.json({
    config: {
      enabled: config.enabled,
      configured: config.configured,
      provider: config.provider,
      model: config.model,
      autoApply: config.autoApply,
      minConfidence: config.minConfidence,
      includePersonalData: config.includePersonalData
    },
    summary: { pendingReview, failed },
    operations
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const body = await req.json()
    if (body.action === 'analyze_pending') {
      return NextResponse.json(await processPendingAIEnhancements(Number(body.limit || 10)))
    }
    if (body.action === 'analyze_import' && Number(body.importId)) {
      return NextResponse.json(await analyzeCalendarImportWithAI(Number(body.importId), {
        autoApply: body.autoApply === true
      }))
    }
    if ((body.action === 'approve' || body.action === 'reject') && body.operationId) {
      return NextResponse.json(await reviewAIOperation(
        String(body.operationId),
        body.action === 'approve',
        auth.user.email
      ))
    }
    return NextResponse.json({ error: 'Azione AI non valida' }, { status: 400 })
  } catch (error: any) {
    console.error('[AI Operations] Errore:', error)
    return NextResponse.json({ error: error.message || 'Errore operazione AI' }, { status: 500 })
  }
}
