import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getAIConfig, safeAIConfig, saveAIConfig } from '@/lib/ai-config'
import { testAIConnection } from '@/lib/ai-provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    return NextResponse.json({ config: safeAIConfig(await getAIConfig()) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore configurazione AI' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const body = await req.json()
    await saveAIConfig({
      provider: String(body.provider || 'openai'),
      model: String(body.model || ''),
      baseUrl: String(body.baseUrl || 'https://api.openai.com/v1'),
      apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined,
      enabled: body.enabled === true,
      autoApply: body.autoApply === true,
      minConfidence: Number(body.minConfidence),
      includePersonalData: body.includePersonalData === true,
      updatedBy: auth.user.email
    })
    return NextResponse.json({ config: safeAIConfig(await getAIConfig()) })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Errore salvataggio AI' }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    const config = await getAIConfig()
    if (!config.configured || !config.apiKey) throw new Error('Salva e abilita prima la configurazione AI')
    return NextResponse.json(await testAIConnection(config))
    /*
    const response = await fetch(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: 'Rispondi soltanto con: connessione riuscita',
        max_output_tokens: 30
      }),
      signal: AbortSignal.timeout(30000)
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result?.error?.message || `Errore AI HTTP ${response.status}`)
    return NextResponse.json({ success: true, message: 'Connessione AI riuscita', responseId: result.id || null })
    */
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Test AI non riuscito' }, { status: 400 })
  }
}
