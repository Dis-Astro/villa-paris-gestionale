import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ensureInitialAdmin, getJwtExpiryHours, signToken, verifyPassword } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await ensureInitialAdmin()
    const body = await req.json()
    const email = body.email?.trim()?.toLowerCase()
    const password = body.password || ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password obbligatorie' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    const ok = verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role as any
    })

    const res = NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const secureCookie = process.env.COOKIE_SECURE === 'true' || appUrl.startsWith('https://')

    res.cookies.set('vp_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      path: '/',
      maxAge: 60 * 60 * getJwtExpiryHours()
    })

    await writeAuditLog({
      entityType: 'AUTH',
      entityId: user.id,
      action: 'CREATE',
      metadata: { event: 'LOGIN_SUCCESS' },
      actor: { actorId: user.id, actorRole: user.role, actorEmail: user.email }
    })

    return res
  } catch (error) {
    console.error('Errore login:', error)
    return NextResponse.json({ error: 'Errore login' }, { status: 500 })
  }
}
