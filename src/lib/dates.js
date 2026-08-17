export const toDate = (iso) => new Date(`${iso}T12:00:00`)

export const toIso = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayIso = () => toIso(new Date())

export const addDays = (iso, days) => {
  const date = toDate(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

export const lastDayOfMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate()
