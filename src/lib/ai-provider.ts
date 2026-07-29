import type { AIConfig } from '@/lib/ai-config'

type StructuredRequest = {
  name: string
  schema: Record<string, unknown>
  instructions: string
  input: string
}

async function readJsonResponse(response: Response) {
  const text = await response.text()
  if (!text.trim()) {
    throw new Error(`Il provider AI ha restituito una risposta vuota (HTTP ${response.status})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Il provider AI ha restituito una risposta non valida (HTTP ${response.status})`)
  }
}

function responseText(raw: any) {
  if (typeof raw.output_text === 'string') return raw.output_text
  for (const item of raw.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text
    }
  }
  const chatText = raw?.choices?.[0]?.message?.content
  if (typeof chatText === 'string') return chatText
  throw new Error('La risposta AI non contiene testo utilizzabile')
}

export function isGeminiConfig(config: AIConfig) {
  return config.provider.toLowerCase() === 'gemini' ||
    config.baseUrl.includes('generativelanguage.googleapis.com')
}

export async function requestStructuredAI(
  config: AIConfig,
  request: StructuredRequest
): Promise<{ raw: any; parsed: any }> {
  if (!config.apiKey) throw new Error('Chiave API AI non configurata')
  const gemini = isGeminiConfig(config)
  const url = gemini ? `${config.baseUrl}/chat/completions` : `${config.baseUrl}/responses`
  const body = gemini ? {
    model: config.model,
    reasoning_effort: 'low',
    messages: [
      { role: 'system', content: request.instructions },
      { role: 'user', content: request.input }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: request.name,
        strict: true,
        schema: request.schema
      }
    }
  } : {
    model: config.model,
    store: false,
    reasoning: { effort: 'low' },
    safety_identifier: 'villa-paris-data-automation',
    instructions: request.instructions,
    input: request.input,
    text: {
      format: {
        type: 'json_schema',
        name: request.name,
        strict: true,
        schema: request.schema
      }
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS || '60000'))
  })
  const raw = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(raw?.error?.message || raw?.message || `Errore AI HTTP ${response.status}`)
  }
  try {
    return { raw, parsed: JSON.parse(responseText(raw)) }
  } catch (error: any) {
    if (error instanceof SyntaxError) throw new Error('La risposta AI non contiene JSON valido')
    throw error
  }
}

export async function testAIConnection(config: AIConfig) {
  if (!config.apiKey) throw new Error('Chiave API AI non configurata')
  const gemini = isGeminiConfig(config)
  const url = gemini ? `${config.baseUrl}/chat/completions` : `${config.baseUrl}/responses`
  const body = gemini ? {
    model: config.model,
    messages: [{ role: 'user', content: 'Rispondi soltanto con: connessione riuscita' }],
    max_tokens: 30
  } : {
    model: config.model,
    store: false,
    input: 'Rispondi soltanto con: connessione riuscita',
    max_output_tokens: 30
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  })
  const raw = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(raw?.error?.message || raw?.message || `Errore AI HTTP ${response.status}`)
  }
  return { success: true, message: 'Connessione AI riuscita', responseId: raw.id || null }
}

export async function requestAIChatWithTools(
  config: AIConfig,
  messages: Array<{ role: string; content?: string; tool_call_id?: string; tool_calls?: any[] }>,
  tools: Array<Record<string, unknown>>
) {
  if (!config.apiKey) throw new Error('Chiave API AI non configurata')
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools: tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      })),
      tool_choice: 'auto'
    }),
    signal: AbortSignal.timeout(Number(process.env.AI_CHAT_TIMEOUT_MS || '90000'))
  })
  const raw = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(raw?.error?.message || raw?.message || `Errore AI HTTP ${response.status}`)
  }
  const message = raw?.choices?.[0]?.message
  if (!message) throw new Error('La chat AI non ha restituito una risposta')
  return { raw, message }
}

export async function requestGeminiAudioAnalysis(
  config: AIConfig,
  audio: Buffer,
  mimeType: string,
  schema: Record<string, unknown>,
  instructions: string
) {
  if (!config.apiKey) throw new Error('Chiave API Gemini non configurata')
  if (!isGeminiConfig(config)) throw new Error('L’analisi audio richiede una configurazione Gemini')
  if (audio.byteLength > 20 * 1024 * 1024) throw new Error('La registrazione supera 20 MB')

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: instructions },
          { inline_data: { mime_type: mimeType, data: audio.toString('base64') } }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    }),
    signal: AbortSignal.timeout(Number(process.env.AI_AUDIO_TIMEOUT_MS || '180000'))
  })
  const raw = await readJsonResponse(response)
  if (!response.ok) {
    throw new Error(raw?.error?.message || `Errore Gemini audio HTTP ${response.status}`)
  }
  const text = raw?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.text)
    .filter(Boolean)
    .join('')
  if (!text) throw new Error('Gemini non ha restituito la trascrizione')
  try {
    return { raw, parsed: JSON.parse(text) }
  } catch {
    throw new Error('Gemini ha restituito un’analisi audio non valida')
  }
}
