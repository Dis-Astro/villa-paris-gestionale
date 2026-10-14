export const CALENDAR_WINDOW_YEARS = 2

export function getCalendarWindow(now = new Date()) {
  const from = new Date(now)
  from.setFullYear(from.getFullYear() - CALENDAR_WINDOW_YEARS)
  from.setHours(0, 0, 0, 0)

  const to = new Date(now)
  to.setFullYear(to.getFullYear() + CALENDAR_WINDOW_YEARS)
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

export function calendarSyncScope(now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  // Il suffisso mensile rinnova gradualmente la finestra senza forzare un full sync ogni giorno.
  return `rolling-two-years-each-side-v2-${now.getFullYear()}-${month}`
}

export function isDateWithinCalendarWindow(value: Date, now = new Date()) {
  const { from, to } = getCalendarWindow(now)
  return value >= from && value <= to
}
