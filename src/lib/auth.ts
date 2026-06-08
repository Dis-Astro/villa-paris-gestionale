import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

export type UserRole = 'ADMIN' | 'REPORT' | 'WORKER'

export interface AuthTokenPayload {
  sub: string
  email: string
  role: UserRole
  exp: number
  iat: number
}

function b64url(input: Buffer | string) {
  const buff = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buff.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlDecode(input: string) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64').toString('utf-8')
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET mancante. Configura la variabile ambiente.')
  }
  return secret
}

export function getJwtExpiryHours() {
  const raw = process.env.JWT_EXPIRES_HOURS
  if (!raw) throw new Error('JWT_EXPIRES_HOURS mancante. Configura la variabile ambiente.')
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) throw new Error('JWT_EXPIRES_HOURS non valido.')
  return n
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64)
  return `${salt}:${hash.toString('hex')}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(':')
  if (!salt || !key) return false
  const expected = Buffer.from(key, 'hex')
  const candidate = scryptSync(password, salt, 64)
  return timingSafeEqual(expected, candidate)
}

export function signToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>) {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + getJwtExpiryHours() * 3600
  const fullPayload: AuthTokenPayload = { ...payload, iat: now, exp }
  const header = { alg: 'HS256', typ: 'JWT' }

  const encodedHeader = b64url(JSON.stringify(header))
  const encodedPayload = b64url(JSON.stringify(fullPayload))
  const data = `${encodedHeader}.${encodedPayload}`
  const sig = createHmac('sha256', getJwtSecret()).update(data).digest()
  const encodedSig = b64url(sig)
  return `${data}.${encodedSig}`
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const [h, p, s] = token.split('.')
    if (!h || !p || !s) return null

    const data = `${h}.${p}`
    const expected = b64url(createHmac('sha256', getJwtSecret()).update(data).digest())
    if (expected !== s) return null

    const raw = b64urlDecode(p)
    const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as AuthTokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp <= now) return null
    return payload
  } catch {
    return null
  }
}

export function tokenFromRequest(req: NextRequest) {
  const cookieToken = req.cookies.get('vp_token')?.value
  if (cookieToken) return cookieToken
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function requireAuth(req: NextRequest, roles?: UserRole[]) {
  const token = tokenFromRequest(req)
  if (!token) return { ok: false as const, status: 401, error: 'Non autenticato' }

  const payload = verifyToken(token)
  if (!payload) return { ok: false as const, status: 401, error: 'Token non valido o scaduto' }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.isActive) return { ok: false as const, status: 403, error: 'Utente non attivo' }

  if (roles && roles.length > 0 && !roles.includes(user.role as UserRole)) {
    return { ok: false as const, status: 403, error: 'Permesso negato' }
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive
    }
  }
}

export async function ensureInitialAdmin() {
  const email = 'admin@villaparis.local'
  const password = 'Admin123!'
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return exists

  return prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: 'ADMIN',
      isActive: true
    }
  })
}
