import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import {
  getGoogleImportRollbackPreview,
  rollbackGoogleImport
} from '@/lib/google-calendar-rollback'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const preview = await getGoogleImportRollbackPreview()
    return NextResponse.json({
      totalImports: preview.totalImports,
      candidateImports: preview.candidateImports,
      eventiDaRimuovere: preview.eventiDaRimuovere,
      appuntamentiDaRimuovere: preview.appuntamentiDaRimuovere,
      clientiDaRimuovere: preview.clientiDaRimuovere,
      preservedLinkedResources: preview.preservedLinkedResources,
      earliestImport: preview.earliestImport
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore anteprima rollback' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const body = await req.json()
    if (body.confirm !== 'ROLLBACK_GOOGLE_IMPORT') {
      return NextResponse.json({ error: 'Conferma rollback non valida' }, { status: 400 })
    }
    return NextResponse.json(await rollbackGoogleImport())
  } catch (error: any) {
    console.error('[GCal Rollback] Errore:', error)
    return NextResponse.json({ error: error.message || 'Errore rollback importazione' }, { status: 500 })
  }
}
