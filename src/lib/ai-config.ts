import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'
import prisma from '@/lib/prisma'

export type AIConfig = {
  enabled: boolean
  configured: boolean
  provider: string
  model: string
  baseUrl: string
  apiKey: string | null
  autoApply: boolean
  minConfidence: number
  includePersonalData: boolean
  source: 'database' | 'environment'
}

export type SafeAIConfig = Omit<AIConfig, 'apiKey'> & {
  hasApiKey: boolean
}

function encryptionKey() {
  const secret = process.env.AI_CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('Configura AI_CONFIG_ENCRYPTION_KEY o JWT_SECRET per cifrare la chiave AI')
  }
  return createHash('sha256').update(secret).digest()
}

export function encryptAISecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':')
}

export function decryptAISecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(':')
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Chiave AI cifrata non valida')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64')),
    decipher.final()
  ]).toString('utf8')
}

function boundedConfidence(value: unknown, fallback = 0.9) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback
}

export function normalizeAIBaseUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, '')
  const url = new URL(normalized)
  const localDevelopment = process.env.NODE_ENV !== 'production' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  if (url.protocol !== 'https:' && !localDevelopment) {
    throw new Error('L’indirizzo AI deve usare HTTPS')
  }
  return normalized
}

export async function getAIConfig(): Promise<AIConfig> {
  const stored = await prisma.aiConfiguration.findFirst({ orderBy: { id: 'asc' } })
  if (stored) {
    let apiKey: string | null = null
    if (stored.apiKeyEncrypted) apiKey = decryptAISecret(stored.apiKeyEncrypted)
    return {
      enabled: stored.enabled,
      configured: stored.enabled && Boolean(apiKey),
      provider: stored.provider,
      model: stored.model,
      baseUrl: normalizeAIBaseUrl(stored.baseUrl),
      apiKey,
      autoApply: stored.autoApply,
      minConfidence: boundedConfidence(stored.minConfidence),
      includePersonalData: stored.includePersonalData,
      source: 'database'
    }
  }

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || null
  const enabled = process.env.AI_ENABLED === 'true'
  return {
    enabled,
    configured: enabled && Boolean(apiKey),
    provider: process.env.AI_PROVIDER || 'openai',
    model: process.env.AI_MODEL || 'gpt-5.6-terra',
    baseUrl: normalizeAIBaseUrl(process.env.AI_BASE_URL || 'https://api.openai.com/v1'),
    apiKey,
    autoApply: process.env.AI_AUTO_APPLY === 'true',
    minConfidence: boundedConfidence(process.env.AI_MIN_CONFIDENCE),
    includePersonalData: process.env.AI_INCLUDE_PERSONAL_DATA === 'true',
    source: 'environment'
  }
}

export function safeAIConfig(config: AIConfig): SafeAIConfig {
  const { apiKey, ...safe } = config
  return { ...safe, hasApiKey: Boolean(apiKey) }
}

export async function saveAIConfig(input: {
  provider: string
  model: string
  baseUrl: string
  apiKey?: string
  enabled: boolean
  autoApply: boolean
  minConfidence: number
  includePersonalData: boolean
  updatedBy: string
}) {
  const current = await prisma.aiConfiguration.findFirst({ orderBy: { id: 'asc' } })
  const provider = input.provider.trim().toLowerCase()
  const model = input.model.trim()
  if (!provider) throw new Error('Provider AI obbligatorio')
  if (!model) throw new Error('Modello AI obbligatorio')
  const apiKey = input.apiKey?.trim()
  const data = {
    provider,
    model,
    baseUrl: normalizeAIBaseUrl(input.baseUrl),
    enabled: input.enabled,
    autoApply: input.autoApply,
    minConfidence: boundedConfidence(input.minConfidence),
    includePersonalData: input.includePersonalData,
    updatedBy: input.updatedBy,
    ...(apiKey ? { apiKeyEncrypted: encryptAISecret(apiKey) } : {})
  }
  if (current) return prisma.aiConfiguration.update({ where: { id: current.id }, data })
  if (!apiKey && input.enabled) throw new Error('Inserisci una chiave API prima di abilitare l’AI')
  return prisma.aiConfiguration.create({ data })
}
