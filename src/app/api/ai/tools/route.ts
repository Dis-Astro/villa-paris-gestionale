import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { aiToolDefinitions, executeAITool } from '@/lib/ai-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function authorize(req: NextRequest) {
  const secret = process.env.AI_TOOL_SECRET
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) {
    return { ok: true as const, actor: 'external-ai-agent' }
  }
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return auth
  return { ok: true as const, actor: auth.user.email }
}

export async function GET(req: NextRequest) {
  const auth = await authorize(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  return NextResponse.json({
    name: 'villa_paris_gestionale',
    writesEnabled: process.env.AI_TOOLS_WRITE_ENABLED === 'true',
    tools: aiToolDefinitions
  })
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const body = await req.json()
    if (!body.name || typeof body.arguments !== 'object') {
      return NextResponse.json({ error: 'name e arguments sono obbligatori' }, { status: 400 })
    }
    const result = await executeAITool(body.name, body.arguments, {
      actor: auth.actor,
      writesEnabled: process.env.AI_TOOLS_WRITE_ENABLED === 'true'
    })
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('[AI Tools] Errore:', error)
    return NextResponse.json({ error: error.message || 'Errore strumento AI' }, { status: 400 })
  }
}
