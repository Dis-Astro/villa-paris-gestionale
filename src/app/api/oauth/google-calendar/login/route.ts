import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getAuthUrl } from '@/lib/google-calendar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const url = getAuthUrl()
    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Errore generazione URL OAuth:', error)
    return NextResponse.json({ error: 'Errore nella generazione del link di autorizzazione' }, { status: 500 })
  }
}
