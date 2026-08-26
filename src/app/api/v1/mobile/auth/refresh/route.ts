import { NextRequest, NextResponse } from 'next/server'
import { rotateMobileSession } from '@/lib/mobile-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const refreshToken = String(body.refreshToken || '')
    if (!refreshToken) {
      return NextResponse.json({ error: { code: 'REFRESH_REQUIRED', message: 'Sessione da rinnovare mancante' } }, { status: 400 })
    }
    const session = await rotateMobileSession(refreshToken, body.deviceName)
    if (!session) {
      return NextResponse.json({ error: { code: 'SESSION_EXPIRED', message: 'Sessione scaduta: accedi di nuovo' } }, { status: 401 })
    }
    return NextResponse.json({ apiVersion: '1', ...session }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[Mobile Auth] Errore rinnovo:', error)
    return NextResponse.json({ error: { code: 'REFRESH_FAILED', message: 'Rinnovo sessione non riuscito' } }, { status: 500 })
  }
}
