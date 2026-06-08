import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getOperationalReport, parseReportFilters } from '@/lib/report/operational'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN', 'REPORT'])
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(req.url)
    const filters = parseReportFilters(searchParams)
    const report = await getOperationalReport(filters)
    return NextResponse.json(report)
  } catch (error) {
    console.error('[Report Stats] Errore:', error)
    return NextResponse.json(
      { error: 'Errore nel recupero statistiche report', detail: String(error) },
      { status: 500 }
    )
  }
}