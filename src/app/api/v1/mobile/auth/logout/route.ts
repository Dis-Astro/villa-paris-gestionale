import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { revokeMobileSession } from '@/lib/mobile-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const refreshToken = String(body.refreshToken || '')
  if (refreshToken) await revokeMobileSession(refreshToken)
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
}
