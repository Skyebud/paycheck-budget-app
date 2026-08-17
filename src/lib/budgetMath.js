import { addDays, todayIso } from './dates'
import { scheduleOccurrences } from './recurrence'

export function calculateBudgetView(data) {
  const occurrenceRange = {
    start: addDays(todayIso(), -365),
    end: addDays(todayIso(), 550),
  }

  let actualNetTotal = 0
  let grossTotal = 0

  data.income
    .filter((item) => item.kind === 'paycheck')
    .forEach((item) => {
      Object.values(item.actuals || {}).forEach((actual) => {
        if (actual.actualNet == null) return

        const rate = Number(
          item.hourlyRate || data.settings.hourlyRate || 0,
        )
        const regular = Number(
          actual.regularHours ?? item.regularHours ?? 0,
        )
        const overtime = Number(
          actual.overtimeHours ?? item.overtimeHours ?? 0,
        )
        const multiplier = Number(
          item.overtimeMultiplier ||
            data.settings.overtimeMultiplier ||
            1.5,
        )

        const gross =
          item.payMode === 'fixed'
            ? Number(item.grossAmount || item.amount || 0)
            : regular * rate + overtime * rate * multiplier

        if (gross > 0) {
          grossTotal += gross
          actualNetTotal += Number(actual.actualNet)
        }
      })
    })

  const learnedNetPercent =
    grossTotal > 0 ? (actualNetTotal / grossTotal) * 100 : null

  const effectiveNetPercent =
    data.settings.autoLearnNet !== false && learnedNetPercent != null
      ? learnedNetPercent
      : Number(data.settings.estimatedNetPercent || 83)

  const projectedIncomeAmount = (item, date) => {
    const actual = item.actuals?.[date]

    if (actual?.actualNet != null) return Number(actual.actualNet)
    if (item.kind !== 'paycheck') return Number(item.amount || 0)

    if (item.payMode === 'fixed') {
      return Number(item.expectedNet || item.amount || 0)
    }

    const rate = Number(
      item.hourlyRate || data.settings.hourlyRate || 0,
    )
    const regular = Number(item.regularHours || 0)
    const overtime = Number(item.overtimeHours || 0)
    const multiplier = Number(
      item.overtimeMultiplier ||
        data.settings.overtimeMultiplier ||
        1.5,
    )

    const gross = regular * rate + overtime * rate * multiplier

    return gross > 0
      ? gross * (effectiveNetPercent / 100)
      : Number(item.expectedNet || 0)
  }

  const incomeOccurrences = data.income
    .flatMap((item) =>
      scheduleOccurrences(
        item,
        occurrenceRange.start,
        occurrenceRange.end,
      ).map((date) => ({
        key: `${item.id}:${date}`,
        item,
        date,
        amount: projectedIncomeAmount(item, date),
        actual: item.actuals?.[date],
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const billOccurrences = data.bills
    .flatMap((bill) =>
      scheduleOccurrences(
        {
          ...bill,
          recurrence: bill.scheduleType,
          firstDate: bill.anchorDate || bill.dueDate,
        },
        occurrenceRange.start,
        occurrenceRange.end,
      ).map((date) => ({
        key: `${bill.id}:${date}`,
        bill,
        date,
        paid: bill.paidDates?.includes(date) ?? false,
      })),
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const now = todayIso()
  const futureIncome = incomeOccurrences.filter(
    (occurrence) => occurrence.date >= now,
  )

  const nextIncome = futureIncome[0]
  const followingIncome = futureIncome[1]
  const cycleStart = nextIncome?.date || now
  const cycleEnd = followingIncome
    ? addDays(followingIncome.date, -1)
    : addDays(cycleStart, 13)

  const cycleBills = billOccurrences.filter(
    (occurrence) =>
      occurrence.date >= cycleStart && occurrence.date <= cycleEnd,
  )

  const unpaidCycleBills = cycleBills.filter(
    (occurrence) => !occurrence.paid,
  )

  const cycleTransactions = data.transactions.filter(
    (transaction) =>
      transaction.date >= cycleStart && transaction.date <= cycleEnd,
  )

  const plannedCycle = cycleTransactions.filter(
    (transaction) => transaction.type === 'planned',
  )

  const spentCycle = cycleTransactions.filter(
    (transaction) => transaction.type === 'spent',
  )

  const billsTotal = unpaidCycleBills.reduce(
    (sum, occurrence) =>
      sum + Number(occurrence.bill.amount || 0),
    0,
  )

  const plannedTotal = plannedCycle.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  )

  const spentTotal = spentCycle.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  )

  const safeToSpend =
    Number(nextIncome?.amount || 0) -
    billsTotal -
    plannedTotal -
    spentTotal

  const upcomingRows = [
    ...cycleBills.map((occurrence) => ({
      key: occurrence.key,
      date: occurrence.date,
      name: occurrence.bill.name,
      category: occurrence.bill.category || 'Bill',
      amount: Number(occurrence.bill.amount || 0),
      type: 'bill',
      paid: occurrence.paid,
      occurrence,
    })),
    ...plannedCycle.map((transaction) => ({
      key: transaction.id,
      date: transaction.date,
      name: transaction.name,
      category: 'Planned',
      amount: Number(transaction.amount || 0),
      type: 'planned',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return {
    learnedNetPercent,
    effectiveNetPercent,
    incomeOccurrences,
    billOccurrences,
    nextIncome,
    cycleEnd,
    billsTotal,
    plannedTotal,
    spentTotal,
    safeToSpend,
    upcomingRows,
  }
}
