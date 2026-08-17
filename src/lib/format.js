export function money(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0))
}

export function shortDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${iso}T12:00:00`))
}

export function weekday(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
  }).format(new Date(`${iso}T12:00:00`))
}

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
