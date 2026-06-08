import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client } from '@/lib/google-calendar'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function buildRedirectUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}${path}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(buildRedirectUrl('/impostazioni?gcal=error&msg=' + encodeURIComponent(error)))
  }

  if (!code) {
    return NextResponse.redirect(buildRedirectUrl('/impostazioni?gcal=error&msg=no_code'))
  }

  // Verifica che l'utente sia loggato come ADMIN
  const token = req.cookies.get('vp_token')?.value
  if (!token) {
    return NextResponse.redirect(buildRedirectUrl('/impostazioni?gcal=error&msg=not_authenticated'))
  }

  const payload = verifyToken(token)
  if (!payload || payload.role !== 'ADMIN') {
    return NextResponse.redirect(buildRedirectUrl('/impostazioni?gcal=error&msg=not_admin'))
  }

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    await prisma.googleCalendarConfig.upsert({
      where: { userId: payload.sub },
      create: {
        userId: payload.sub,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId: 'primary',
        isActive: true
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        connectedAt: new Date()
      }
    })

    return NextResponse.redirect(buildRedirectUrl('/impostazioni?gcal=success'))
  } catch (error: any) {
    console.error('Errore OAuth callback:', error)
    return NextResponse.redirect(buildRedirectUrl('/impostazioni?gcal=error&msg=' + encodeURIComponent(error.message || 'token_exchange_failed')))
  }
}
