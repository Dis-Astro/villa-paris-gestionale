export function computeScadenzaOpzione(dataAppuntamento: Date) {
  const d = new Date(dataAppuntamento)
  d.setMonth(d.getMonth() + 2)
  return d
}

export function computeExtraUnlock(scadenza: Date) {
  const d = new Date(scadenza)
  d.setDate(d.getDate() + 7)
  return d
}

export function normalizeStatoOpzione(params: {
  dateOpzionate: string[]
  isConfermata?: boolean
  extraUnlockFinoAl?: Date | null
  now?: Date
}) {
  const now = params.now || new Date()
  if (!params.dateOpzionate.length) return 'nessuna'
  if (params.isConfermata) return 'confermata'

  const hasExtra = params.extraUnlockFinoAl && params.extraUnlockFinoAl >= now
  if (hasExtra) return 'sblocco_extra'

  return 'opzionata'
}
