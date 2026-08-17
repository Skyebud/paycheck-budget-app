import { addDays, lastDayOfMonth, toDate, toIso } from './dates'
import { weekday } from './format'

export function scheduleOccurrences(
  item,
  startIso,
  endIso,
  recurrenceKey = 'recurrence',
  dateKey = 'firstDate',
) {
  const recurrence = item[recurrenceKey] || 'once'
  const anchor = item[dateKey] || item.anchorDate || item.dueDate

  if (!anchor || !startIso || !endIso) return []

  const output = []
  const push = (date) => {
    if (date >= startIso && date <= endIso) output.push(date)
  }

  if (recurrence === 'once') {
    push(anchor)
    return output
  }

  if (recurrence === 'weekly' || recurrence === 'biweekly') {
    const step = recurrence === 'weekly' ? 7 : 14
    let cursor = anchor

    while (cursor < startIso) cursor = addDays(cursor, step)

    while (cursor <= endIso) {
      push(cursor)
      cursor = addDays(cursor, step)
    }

    return output
  }

  if (recurrence === 'monthly') {
    const start = toDate(startIso)
    const end = toDate(endIso)
    const anchorDate = toDate(anchor)
    const day = anchorDate.getDate()
    let year = start.getFullYear()
    let month = start.getMonth()

    while (
      year < end.getFullYear() ||
      (year === end.getFullYear() && month <= end.getMonth())
    ) {
      const date = new Date(
        year,
        month,
        Math.min(day, lastDayOfMonth(year, month)),
      )

      const iso = toIso(date)
      if (iso >= anchor) push(iso)

      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }

    return output
  }

  if (recurrence === 'yearly') {
    const anchorDate = toDate(anchor)

    for (
      let year = toDate(startIso).getFullYear();
      year <= toDate(endIso).getFullYear();
      year += 1
    ) {
      const date = new Date(
        year,
        anchorDate.getMonth(),
        Math.min(
          anchorDate.getDate(),
          lastDayOfMonth(year, anchorDate.getMonth()),
        ),
      )

      const iso = toIso(date)
      if (iso >= anchor) push(iso)
    }
  }

  return output
}

export function recurrenceLabel(value, firstDate) {
  if (!firstDate) return 'Not scheduled'
  if (value === 'weekly') return `Weekly · ${weekday(firstDate)}`
  if (value === 'biweekly') return `Every 2 weeks · ${weekday(firstDate)}`
  if (value === 'monthly') return `Monthly · day ${toDate(firstDate).getDate()}`
  if (value === 'yearly') return 'Yearly'
  return 'One-time'
}
