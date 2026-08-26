import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ensureInitialAdmin, verifyPassword } from '@/lib/auth'
import { createMobileSession } from '@/lib/mobile-auth'
import { writeAuditLog } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await ensureInitialAdmin()
    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!email || !password) {
      return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Email e password obbligatorie' } }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.isActive || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenziali non valide' } }, { status: 401 })
    }

    const session = await createMobileSession(user, body.deviceName)
    await writeAuditLog({
      entityType: 'AUTH',
      entityId: user.id,
      action: 'CREATE',
      metadata: { event: 'MOBILE_LOGIN_SUCCESS', deviceName: String(body.deviceName || '').slice(0, 120) || null },
      actor: { actorId: user.id, actorRole: user.role, actorEmail: user.email }
    })

    return NextResponse.json({ apiVersion: '1', ...session }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (error) {
    console.error('[Mobile Auth] Errore login:', error)
    return NextResponse.json({ error: { code: 'LOGIN_FAILED', message: 'Accesso non riuscito' } }, { status: 500 })
  }
}
