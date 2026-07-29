import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getAIConfig } from '@/lib/ai-config'
import { requestAIChatWithTools } from '@/lib/ai-provider'
import { aiToolDefinitions, executeAITool } from '@/lib/ai-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const WRITE_TOOLS = new Set(['create_record', 'update_record'])
const READ_TOOLS = new Set(['search_records', 'get_record', 'run_quality_audit', 'generate_management_report'])

function safeArguments(value: unknown) {
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    throw new Error('La AI ha proposto argomenti non validi')
  }
}

function redact(value: unknown) {
  return JSON.stringify(value)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/(?:\+39[\s.-]?)?(?:\d[\s.-]?){8,11}\d/g, '[TELEFONO]')
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN'])
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const body = await req.json()
    const config = await getAIConfig()
    if (!config.configured) throw new Error('Gemini non è configurata o è disabilitata')

    if (body.action === 'approve' || body.action === 'reject') {
      const operation = await prisma.aiOperation.findUnique({ where: { id: String(body.operationId || '') } })
      if (!operation || operation.sourceType !== 'ai_admin_chat' || operation.status !== 'review') {
        throw new Error('Proposta non trovata o già elaborata')
      }
      if (body.action === 'reject') {
        await prisma.aiOperation.update({
          where: { id: operation.id },
          data: {
            status: 'rejected',
            reviewedBy: auth.user.email,
            reviewedAt: new Date(),
            completedAt: new Date()
          }
        })
        return NextResponse.json({ success: true, status: 'rejected' })
      }

      const proposal = JSON.parse(operation.proposedChanges || '{}')
      if (!WRITE_TOOLS.has(proposal.name)) throw new Error('Operazione proposta non consentita')
      try {
        const result = await executeAITool(proposal.name, proposal.arguments || {}, {
          actor: auth.user.email,
          writesEnabled: true
        })
        await prisma.aiOperation.update({
          where: { id: operation.id },
          data: {
            status: 'applied',
            appliedChanges: JSON.stringify(result),
            reviewedBy: auth.user.email,
            reviewedAt: new Date(),
            completedAt: new Date()
          }
        })
        return NextResponse.json({ success: true, status: 'applied', result })
      } catch (error: any) {
        await prisma.aiOperation.update({
          where: { id: operation.id },
          data: { status: 'failed', error: error.message || String(error), completedAt: new Date() }
        })
        throw error
      }
    }

    const prompt = String(body.message || '').trim().slice(0, 6000)
    if (!prompt) throw new Error('Scrivi una richiesta')
    const history = Array.isArray(body.history)
      ? body.history.slice(-16).map((item: any) => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: String(item.content || '').slice(0, 6000)
        }))
      : []
    const messages: any[] = [
      {
        role: 'system',
        content: [
          'Sei l’assistente gestionale di Villa Paris e lavori esclusivamente per un Administrator autenticato.',
          'Puoi leggere clienti, eventi e appuntamenti, controllare la qualità e redigere report usando gli strumenti.',
          'Opera sugli ultimi tre anni salvo richiesta esplicita di semplice consultazione storica.',
          'Non inventare ID, nomi, date, recapiti o risultati degli strumenti.',
          'Per creare o modificare dati devi usare create_record o update_record: l’applicazione chiederà sempre conferma umana.',
          'Non puoi eliminare dati, cambiare utenti, configurazioni, chiavi, codice sorgente o file del server.',
          'Spiega in italiano in modo sintetico cosa hai trovato o cosa proponi.'
        ].join('\n')
      },
      ...history,
      { role: 'user', content: prompt }
    ]

    const proposals: any[] = []
    let finalText = ''
    for (let turn = 0; turn < 6; turn++) {
      const { message } = await requestAIChatWithTools(config, messages, aiToolDefinitions)
      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : []
      if (!toolCalls.length) {
        finalText = typeof message.content === 'string' ? message.content : ''
        break
      }

      messages.push({
        role: 'assistant',
        content: typeof message.content === 'string' ? message.content : '',
        tool_calls: toolCalls
      })
      let hasWrite = false
      for (const call of toolCalls) {
        const name = String(call?.function?.name || '')
        const args = safeArguments(call?.function?.arguments)
        if (WRITE_TOOLS.has(name)) {
          hasWrite = true
          const operation = await prisma.aiOperation.create({
            data: {
              sourceType: 'ai_admin_chat',
              operationType: name,
              status: 'review',
              provider: config.provider,
              model: config.model,
              inputData: JSON.stringify({ prompt }),
              proposedChanges: JSON.stringify({ name, arguments: args }),
              requiresReview: true
            }
          })
          proposals.push({ id: operation.id, name, arguments: args })
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ status: 'requires_admin_confirmation', operationId: operation.id })
          })
        } else if (READ_TOOLS.has(name)) {
          const result = await executeAITool(name, args, {
            actor: auth.user.email,
            writesEnabled: false
          })
          const serialized = config.includePersonalData ? JSON.stringify(result) : redact(result)
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: serialized.slice(0, 30000)
          })
        } else {
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify({ error: 'Strumento non consentito' })
          })
        }
      }
      if (hasWrite) {
        finalText = typeof message.content === 'string' && message.content.trim()
          ? message.content
          : 'Ho preparato una modifica. Controlla i dettagli e approvala prima dell’applicazione.'
        break
      }
    }

    return NextResponse.json({
      success: true,
      message: finalText || 'Analisi completata.',
      proposals
    })
  } catch (error: any) {
    console.error('[AI Chat] Errore:', error)
    return NextResponse.json({ error: error.message || 'Errore chat AI' }, { status: 400 })
  }
}
