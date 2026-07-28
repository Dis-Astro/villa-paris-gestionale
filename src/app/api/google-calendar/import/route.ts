import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { importGoogleCalendar } from '@/lib/google-calendar-import'
import { processPendingAIEnhancements } from '@/lib/ai-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function authorize(req: NextRequest) {
  const configuredSecret = process.env.CALENDAR_SYNC_SECRET
  const authorization = req.headers.get('authorization')
  const cronAuthorized = Boolean(
    configuredSecret && authorization === `Bearer ${configuredSecret}`
  )
  if (cronAuthorized) return { ok: true as const, source: 'automation' }

  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return auth
  return { ok: true as const, source: auth.user.email }
}

async function run(req: NextRequest) {
  const auth = await authorize(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const forceFull = req.nextUrl.searchParams.get('full') === '1'
    const result = await importGoogleCalendar({ forceFull })
    const ai = req.nextUrl.searchParams.get('ai') === '0'
      ? null
      : await processPendingAIEnhancements()
    return NextResponse.json({ success: true, source: auth.source, ...result, ai })
  } catch (error: any) {
    console.error('[GCal Import] Errore:', error)
    return NextResponse.json(
      { error: error.message || 'Errore durante l’importazione da Google Calendar' },
      { status: 500 }
    )
  }
}

// GET è compatibile con cron/monitor HTTP; POST è usato dall'interfaccia.
export async function GET(req: NextRequest) {
  return run(req)
}

export async function POST(req: NextRequest) {
  return run(req)
}

// Stato sintetico della coda importazioni per la schermata Impostazioni.
export async function OPTIONS(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [totale, daVerificare, cancellati, ultimi] = await Promise.all([
    prisma.googleCalendarImport.count(),
    prisma.googleCalendarImport.count({ where: { stato: 'review' } }),
    prisma.googleCalendarImport.count({ where: { stato: 'deleted' } }),
    prisma.googleCalendarImport.findMany({
      orderBy: { lastImportedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        gcalEventId: true,
        tipoRisorsa: true,
        risorsaId: true,
        stato: true,
        warning: true,
        lastImportedAt: true
      }
    })
  ])

  return NextResponse.json({ totale, daVerificare, cancellati, ultimi })
}
