import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, type UserRole } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function capabilities(role: UserRole) {
  return {
    canEditOperationalData: role === 'ADMIN' || role === 'WORKER',
    canViewReports: role === 'ADMIN' || role === 'REPORT',
    canUseAI: role === 'ADMIN',
    canManageUsers: role === 'ADMIN'
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth.ok) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: auth.error } }, { status: auth.status })

  return NextResponse.json({
    apiVersion: '1',
    serverTime: new Date().toISOString(),
    minimumSupportedIOSVersion: '17.0',
    user: auth.user,
    capabilities: capabilities(auth.user.role),
    features: {
      calendar: true,
      appointments: true,
      clients: true,
      reports: auth.user.role !== 'WORKER',
      aiAssistant: auth.user.role === 'ADMIN',
      audioAppointmentCapture: true,
      pushNotifications: false
    }
  }, { headers: { 'Cache-Control': 'no-store' } })
}
