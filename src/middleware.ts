import { NextRequest, NextResponse } from 'next/server'

type Role = 'ADMIN' | 'REPORT' | 'WORKER'

function decodePayload(token: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const raw = atob(base64)
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0))
    const decoded = new TextDecoder().decode(bytes)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function isAllowedForWorker(pathname: string) {
  const allowed = [
    '/calendario',
    '/appuntamenti',
    '/eventi',
    '/modifica-evento',
    '/nuovo-evento',
    '/piantina-evento',
    '/clienti',
    '/rapportini-interni',
    '/menu-base',
    '/stampe',
    '/api/eventi',
    '/api/clienti',
    '/api/presenze-villa',
    '/api/menu-base',
    '/api/versioni',
    '/api/piantine',
    '/api/appuntamenti',
    '/api/auth/me',
    '/api/auth/logout',
    '/api/meteo'
  ]
  return allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isAllowedForReport(pathname: string, method: string) {
  const allowedPages = [
    '/dashboard',
    '/calendario',
    '/rapportini-interni',
    '/report',
    '/stampe',
    '/audit'
  ]

  const allowedApiPrefixes = [
    '/api/auth/me',
    '/api/auth/logout',
    '/api/report',
    '/api/audit',
    '/api/presenze-villa',
    '/api/eventi',
    '/api/clienti',
    '/api/appuntamenti',
    '/api/meteo'
  ]

  if (!pathname.startsWith('/api/')) {
    return allowedPages.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  }

  const isAllowedPrefix = allowedApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!isAllowedPrefix) return false

  if (pathname.startsWith('/api/presenze-villa')) {
    return method === 'GET'
  }

  if (pathname.startsWith('/api/eventi') || pathname.startsWith('/api/clienti') || pathname.startsWith('/api/appuntamenti')) {
    return method === 'GET'
  }

  return true
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/planimetrie/')
  ) {
    return NextResponse.next()
  }

  const isLoginPath = pathname === '/login'
  const isAuthApi = pathname.startsWith('/api/auth/login')
  const isOAuthCallback = pathname.startsWith('/api/oauth/google-calendar/callback')

  if (isLoginPath || isAuthApi || isOAuthCallback) return NextResponse.next()

  const token = req.cookies.get('vp_token')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  const payload = decodePayload(token)
  if (!payload || payload.exp * 1000 < Date.now()) {
    const res = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Sessione scaduta' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))

    res.cookies.set('vp_token', '', { path: '/', maxAge: 0 })
    return res
  }

  const role = payload.role as Role

  // Solo Admin su gestione utenti
  if ((pathname === '/utenti' || pathname.startsWith('/utenti/') || pathname.startsWith('/api/users')) && role !== 'ADMIN') {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
      : NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Audit e report solo Admin/Report
  if (
    pathname.startsWith('/audit') ||
    pathname.startsWith('/api/audit') ||
    pathname.startsWith('/report') ||
    pathname.startsWith('/api/report')
  ) {
    if (!['ADMIN', 'REPORT'].includes(role)) {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
        : NextResponse.redirect(new URL('/calendario', req.url))
    }
  }

  // Worker menu ridotto + route ridotte
  if (role === 'WORKER' && !isAllowedForWorker(pathname)) {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
      : NextResponse.redirect(new URL('/calendario', req.url))
  }

  if (role === 'REPORT' && !isAllowedForReport(pathname, req.method)) {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
      : NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
