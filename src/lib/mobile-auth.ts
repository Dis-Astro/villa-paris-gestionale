import { createHash, randomBytes } from 'crypto'
import prisma from '@/lib/prisma'
import { getJwtExpiryHours, signToken, type UserRole } from '@/lib/auth'

const DEFAULT_REFRESH_DAYS = 30
const MAX_ACTIVE_SESSIONS = 10

function refreshDays() {
  const parsed = Number(process.env.MOBILE_REFRESH_DAYS || DEFAULT_REFRESH_DAYS)
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 365) : DEFAULT_REFRESH_DAYS
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function publicUser(user: { id: string; email: string; role: string; isActive: boolean }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    isActive: user.isActive
  }
}

function accessTokenFor(user: { id: string; email: string; role: string }) {
  return signToken({ sub: user.id, email: user.email, role: user.role as UserRole })
}

function sessionResponse(
  user: { id: string; email: string; role: string; isActive: boolean },
  refreshToken: string,
  refreshExpiresAt: Date
) {
  const accessExpiresAt = new Date(Date.now() + getJwtExpiryHours() * 60 * 60 * 1000)
  return {
    tokenType: 'Bearer' as const,
    accessToken: accessTokenFor(user),
    accessTokenExpiresAt: accessExpiresAt.toISOString(),
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    user: publicUser(user)
  }
}

export async function createMobileSession(
  user: { id: string; email: string; role: string; isActive: boolean },
  deviceName?: string
) {
  const refreshToken = randomBytes(48).toString('base64url')
  const expiresAt = new Date(Date.now() + refreshDays() * 24 * 60 * 60 * 1000)

  await prisma.$transaction(async (tx) => {
    await tx.mobileSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: tokenHash(refreshToken),
        deviceName: deviceName?.trim().slice(0, 120) || null,
        expiresAt
      }
    })

    const obsolete = await tx.mobileSession.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      skip: MAX_ACTIVE_SESSIONS,
      select: { id: true }
    })
    if (obsolete.length) {
      await tx.mobileSession.updateMany({
        where: { id: { in: obsolete.map((item) => item.id) } },
        data: { revokedAt: new Date() }
      })
    }
  })

  return sessionResponse(user, refreshToken, expiresAt)
}

export async function rotateMobileSession(refreshToken: string, deviceName?: string) {
  const current = await prisma.mobileSession.findUnique({
    where: { refreshTokenHash: tokenHash(refreshToken) },
    include: { user: true }
  })
  const now = new Date()
  if (!current || current.revokedAt || current.expiresAt <= now || !current.user.isActive) return null

  const nextToken = randomBytes(48).toString('base64url')
  const nextExpiresAt = new Date(Date.now() + refreshDays() * 24 * 60 * 60 * 1000)

  const rotated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.mobileSession.updateMany({
      where: { id: current.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now, lastUsedAt: now }
    })
    if (claimed.count !== 1) return false
    await tx.mobileSession.create({
      data: {
        userId: current.userId,
        refreshTokenHash: tokenHash(nextToken),
        deviceName: deviceName?.trim().slice(0, 120) || current.deviceName,
        expiresAt: nextExpiresAt
      }
    })
    return true
  })
  if (!rotated) return null

  return sessionResponse(current.user, nextToken, nextExpiresAt)
}

export async function revokeMobileSession(refreshToken: string) {
  await prisma.mobileSession.updateMany({
    where: { refreshTokenHash: tokenHash(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() }
  })
}
