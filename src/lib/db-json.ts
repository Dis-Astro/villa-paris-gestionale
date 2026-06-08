const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')

export function dbJsonSerialize(value: any) {
  return isSqlite ? JSON.stringify(value ?? null) : value
}

export function dbJsonParse<T = any>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

export function isSqliteDb() {
  return isSqlite
}
