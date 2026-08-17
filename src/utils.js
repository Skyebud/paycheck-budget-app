export const money = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0))

const safeDate = (date) => new Date(`${date}T12:00:00`)

export const shortDate = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(safeDate(date))

export const longDate = (date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(safeDate(date))

export const weekday = (date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(safeDate(date))

export const uid = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
