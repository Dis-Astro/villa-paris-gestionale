import prisma from '@/lib/prisma'
import { dbJsonSerialize } from '@/lib/db-json'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

interface ActorContext {
  actorId?: string
  actorRole?: string
  actorEmail?: string
}

function safeJson(value: any) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

function diffObjects(oldObj: any, newObj: any): Record<string, { from: any; to: any }> {
  const oldVal = safeJson(oldObj) || {}
  const newVal = safeJson(newObj) || {}
  const keys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)])
  const diff: Record<string, { from: any; to: any }> = {}

  keys.forEach((k) => {
    const a = oldVal[k]
    const b = newVal[k]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diff[k] = { from: a, to: b }
    }
  })

  return diff
}

export function actorFromHeaders(headers: Headers): ActorContext {
  return {
    actorId: headers.get('x-user-id') || undefined,
    actorRole: headers.get('x-user-role') || 'SYSTEM',
    actorEmail: headers.get('x-user-email') || undefined
  }
}

export async function writeAuditLog(params: {
  entityType: string
  entityId: string | number
  action: AuditAction
  oldValue?: any
  newValue?: any
  actor?: ActorContext
  metadata?: any
}) {
  const { entityType, entityId, action, oldValue, newValue, actor, metadata } = params

  const changed = action === 'UPDATE' ? diffObjects(oldValue, newValue) : undefined

  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId: String(entityId),
        action,
        changedFields: dbJsonSerialize(changed || null),
        oldValue: dbJsonSerialize(safeJson(oldValue) || null),
        newValue: dbJsonSerialize(safeJson(newValue) || null),
        actorId: actor?.actorId,
        actorRole: actor?.actorRole,
        actorEmail: actor?.actorEmail,
        metadata: dbJsonSerialize(safeJson(metadata) || null)
      }
    })
  } catch (error) {
    console.error('[AUDIT] write failed', error)
  }
}
