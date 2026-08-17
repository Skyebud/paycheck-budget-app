import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import { money, shortDate, uid, weekday } from './utils'

const STORAGE_KEY = 'paycheck-budget-v1'

const DEFAULT_SETTINGS = {
  hourlyRate: 22.28,
  overtimeMultiplier: 1.5,
  estimatedNetPercent: 83,
  autoLearnNet: true,
  safetyBuffer: 250,
  themeMode: 'dark',
  accentTheme: 'mint',
}

const SPENDING_CATEGORIES = ['Food', 'Gas', 'Shopping', 'Entertainment', 'Health', 'Other']
const BILL_CATEGORIES = ['Housing', 'Utilities', 'Insurance', 'Debt', 'Subscriptions', 'Transportation', 'Other']

const toDate = (iso) => new Date(`${iso}T12:00:00`)
const toIso = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const todayIso = () => toIso(new Date())
const addDays = (iso, days) => {
  const date = toDate(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}
const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate()

function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    income: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></>,
    expenses: <><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    goals: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l-2.78 2.78A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1.4 1.51V21h-3.2v-.09A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-2.78-2.78A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.51-1.4H3v-3.2h.09A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l2.78-2.78A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1.4-1.51V3h3.2v.09A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l2.78 2.78A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.51 1.4H21v3.2h-.09A1.8 1.8 0 0 0 19.4 15Z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function normalizeData(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const settings = { ...DEFAULT_SETTINGS, ...(source.settings || {}) }

  const migratedIncome = Array.isArray(source.income)
    ? source.income
    : (Array.isArray(source.paychecks) ? source.paychecks : []).map((paycheck) => ({
        id: paycheck.id || uid('income'),
        name: paycheck.label || 'Paycheck',
        kind: 'paycheck',
        recurrence: 'once',
        firstDate: paycheck.date,
        payMode: 'hourly',
        hourlyRate: settings.hourlyRate,
        regularHours: Number(paycheck.regularHours || 0),
        overtimeHours: Number(paycheck.overtimeHours || 0),
        overtimeMultiplier: settings.overtimeMultiplier,
        expectedNet: Number(paycheck.expectedNet || 0),
        actuals: paycheck.actualNet != null
          ? { [paycheck.date]: { actualNet: Number(paycheck.actualNet), regularHours: Number(paycheck.regularHours || 0), overtimeHours: Number(paycheck.overtimeHours || 0) } }
          : {},
      }))

  return {
    setupComplete: source.setupComplete !== false && (migratedIncome.length > 0 || (source.bills || []).length > 0 || source.setupComplete === true),
    settings,
    income: migratedIncome.map((item) => ({ actuals: {}, recurrence: 'once', kind: 'other', ...item })),
    bills: (Array.isArray(source.bills) ? source.bills : []).map((bill) => ({
      ...bill,
      scheduleType: bill.scheduleType || 'once',
      anchorDate: bill.anchorDate || bill.dueDate,
      paidDates: Array.isArray(bill.paidDates) ? bill.paidDates : [],
    })),
    transactions: Array.isArray(source.transactions) ? source.transactions : [],
    goals: Array.isArray(source.goals) ? source.goals : [],
  }
}

function scheduleOccurrences(item, startIso, endIso, recurrenceKey = 'recurrence', dateKey = 'firstDate') {
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
    while (year < end.getFullYear() || (year === end.getFullYear() && month <= end.getMonth())) {
      const date = new Date(year, month, Math.min(day, lastDayOfMonth(year, month)))
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
    const a = toDate(anchor)
    for (let year = toDate(startIso).getFullYear(); year <= toDate(endIso).getFullYear(); year += 1) {
      const date = new Date(year, a.getMonth(), Math.min(a.getDate(), lastDayOfMonth(year, a.getMonth())))
      const iso = toIso(date)
      if (iso >= anchor) push(iso)
    }
  }

  return output
}

function recurrenceLabel(value, firstDate) {
  if (value === 'weekly') return `Weekly · ${weekday(firstDate)}`
  if (value === 'biweekly') return `Every 2 weeks · ${weekday(firstDate)}`
  if (value === 'monthly') return `Monthly · day ${toDate(firstDate).getDate()}`
  if (value === 'yearly') return 'Yearly'
  return 'One-time'
}

function Modal({ title, children, onClose, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(event) => event.stopPropagation()}>
      <header className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </header>
      {children}
    </section>
  </div>
}

function Segmented({ value, onChange, options }) {
  return <div className="segmented">
    {options.map(([optionValue, label]) => (
      <button key={optionValue} type="button" className={value === optionValue ? 'active' : ''} onClick={() => onChange(optionValue)}>{label}</button>
    ))}
  </div>
}

function Tabs({ value, onChange, items }) {
  return <div className="tabs">
    {items.map(([key, label]) => <button key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{label}</button>)}
  </div>
}

function EmptyState({ title, action, onAction }) {
  return <div className="empty-state">
    <strong>{title}</strong>
    {action && <button className="text-button" onClick={onAction}>{action}</button>}
  </div>
}

function App() {
  const [data, setData] = useState(() => {
    try { return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY))) } catch { return normalizeData({}) }
  })
  const [view, setView] = useState('dashboard')
  const [incomeTab, setIncomeTab] = useState('overview')
  const [expenseTab, setExpenseTab] = useState('overview')
  const [modal, setModal] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [actualTarget, setActualTarget] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.themeMode || 'dark'
    document.documentElement.dataset.accent = data.settings.accentTheme || 'mint'
  }, [data.settings.themeMode, data.settings.accentTheme])

  const occurrenceRange = useMemo(() => ({ start: addDays(todayIso(), -365), end: addDays(todayIso(), 550) }), [])

  const learnedNetPercent = useMemo(() => {
    let actualNetTotal = 0
    let grossTotal = 0
    data.income.filter((item) => item.kind === 'paycheck').forEach((item) => {
      Object.values(item.actuals || {}).forEach((actual) => {
        if (actual.actualNet == null) return
        const rate = Number(item.hourlyRate || data.settings.hourlyRate || 0)
        const regular = Number(actual.regularHours ?? item.regularHours ?? 0)
        const overtime = Number(actual.overtimeHours ?? item.overtimeHours ?? 0)
        const multiplier = Number(item.overtimeMultiplier || data.settings.overtimeMultiplier || 1.5)
        const gross = item.payMode === 'fixed'
          ? Number(item.grossAmount || item.amount || 0)
          : regular * rate + overtime * rate * multiplier
        if (gross > 0) {
          grossTotal += gross
          actualNetTotal += Number(actual.actualNet)
        }
      })
    })
    return grossTotal > 0 ? (actualNetTotal / grossTotal) * 100 : null
  }, [data.income, data.settings])

  const effectiveNetPercent = data.settings.autoLearnNet !== false && learnedNetPercent != null
    ? learnedNetPercent
    : Number(data.settings.estimatedNetPercent || 83)

  const projectedIncomeAmount = (item, date) => {
    const actual = item.actuals?.[date]
    if (actual?.actualNet != null) return Number(actual.actualNet)
    if (item.kind !== 'paycheck') return Number(item.amount || 0)
    if (item.payMode === 'fixed') return Number(item.expectedNet || item.amount || 0)
    const rate = Number(item.hourlyRate || data.settings.hourlyRate || 0)
    const regular = Number(item.regularHours || 0)
    const overtime = Number(item.overtimeHours || 0)
    const multiplier = Number(item.overtimeMultiplier || data.settings.overtimeMultiplier || 1.5)
    const gross = regular * rate + overtime * rate * multiplier
    if (gross > 0) return gross * (effectiveNetPercent / 100)
    return Number(item.expectedNet || 0)
  }

  const incomeOccurrences = useMemo(() => {
    return data.income.flatMap((item) =>
      scheduleOccurrences(item, occurrenceRange.start, occurrenceRange.end).map((date) => ({
        key: `${item.id}:${date}`,
        item,
        date,
        amount: projectedIncomeAmount(item, date),
        actual: item.actuals?.[date],
      })),
    ).sort((a, b) => a.date.localeCompare(b.date))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.income, data.settings, effectiveNetPercent, occurrenceRange])

  const billOccurrences = useMemo(() => {
    return data.bills.flatMap((bill) =>
      scheduleOccurrences({ ...bill, recurrence: bill.scheduleType, firstDate: bill.anchorDate || bill.dueDate }, occurrenceRange.start, occurrenceRange.end).map((date) => ({
        key: `${bill.id}:${date}`,
        bill,
        date,
        paid: bill.paidDates?.includes(date),
      })),
    ).sort((a, b) => a.date.localeCompare(b.date))
  }, [data.bills, occurrenceRange])

  const futureIncome = incomeOccurrences.filter((occurrence) => occurrence.date >= todayIso())
  const nextIncome = futureIncome[0]
  const followingIncome = futureIncome[1]
  const cycleStart = nextIncome?.date || todayIso()
  const cycleEnd = followingIncome ? addDays(followingIncome.date, -1) : addDays(cycleStart, 13)
  const cycleBills = billOccurrences.filter((occurrence) => occurrence.date >= cycleStart && occurrence.date <= cycleEnd)
  const unpaidCycleBills = cycleBills.filter((occurrence) => !occurrence.paid)
  const cycleTransactions = data.transactions.filter((transaction) => transaction.date >= cycleStart && transaction.date <= cycleEnd)
  const plannedCycle = cycleTransactions.filter((transaction) => transaction.type === 'planned')
  const spentCycle = cycleTransactions.filter((transaction) => transaction.type === 'spent')
  const billsTotal = unpaidCycleBills.reduce((sum, occurrence) => sum + Number(occurrence.bill.amount || 0), 0)
  const plannedTotal = plannedCycle.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const spentTotal = spentCycle.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const nextIncomeAmount = Number(nextIncome?.amount || 0)
  const safeToSpend = nextIncomeAmount - billsTotal - plannedTotal - spentTotal

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

  const updateSettings = (patch) => setData((current) => ({ ...current, settings: { ...current.settings, ...patch } }))

  const markBillPaid = (occurrence) => {
    setData((current) => ({
      ...current,
      bills: current.bills.map((bill) => bill.id === occurrence.bill.id
        ? { ...bill, paidDates: bill.paidDates.includes(occurrence.date) ? bill.paidDates.filter((date) => date !== occurrence.date) : [...bill.paidDates, occurrence.date] }
        : bill),
    }))
  }

  const deleteIncome = (id) => setData((current) => ({ ...current, income: current.income.filter((item) => item.id !== id) }))
  const deleteBill = (id) => setData((current) => ({ ...current, bills: current.bills.filter((bill) => bill.id !== id) }))
  const deleteTransaction = (id) => setData((current) => ({ ...current, transactions: current.transactions.filter((transaction) => transaction.id !== id) }))

  if (!data.setupComplete) {
    return <SetupScreen data={data} setData={setData} />
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-mark">P</div>
      <nav className="primary-nav">
        {[
          ['dashboard', 'dashboard', 'Dashboard'],
          ['income', 'income', 'Income'],
          ['expenses', 'expenses', 'Expenses'],
          ['goals', 'goals', 'Goals'],
        ].map(([key, icon, label]) => (
          <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><Icon name={icon} /><span>{label}</span></button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}><Icon name="settings" /><span>Settings</span></button>
        <button onClick={() => signOut(auth)}><Icon name="logout" /><span>Sign out</span></button>
      </div>
    </aside>

    <main className="main-content">
      {view === 'dashboard' && <Dashboard
        nextIncome={nextIncome}
        cycleEnd={cycleEnd}
        safeToSpend={safeToSpend}
        billsTotal={billsTotal}
        plannedTotal={plannedTotal}
        spentTotal={spentTotal}
        rows={upcomingRows}
        markBillPaid={markBillPaid}
        onAddIncome={() => { setEditingIncome(null); setModal('income') }}
        onAddBill={() => { setEditingBill(null); setModal('bill') }}
        onAddSpending={() => setModal('spending')}
      />}

      {view === 'income' && <IncomePage
        tab={incomeTab}
        setTab={setIncomeTab}
        income={data.income}
        occurrences={incomeOccurrences}
        effectiveNetPercent={effectiveNetPercent}
        learnedNetPercent={learnedNetPercent}
        onAdd={() => { setEditingIncome(null); setModal('income') }}
        onEdit={(item) => { setEditingIncome(item); setModal('income') }}
        onDelete={deleteIncome}
        onRecord={(occurrence) => { setActualTarget(occurrence); setModal('actual') }}
      />}

      {view === 'expenses' && <ExpensesPage
        tab={expenseTab}
        setTab={setExpenseTab}
        bills={data.bills}
        billOccurrences={billOccurrences}
        transactions={data.transactions}
        onAddBill={() => { setEditingBill(null); setModal('bill') }}
        onEditBill={(bill) => { setEditingBill(bill); setModal('bill') }}
        onDeleteBill={deleteBill}
        onTogglePaid={markBillPaid}
        onAddSpending={() => setModal('spending')}
        onAddPlanned={() => setModal('planned')}
        onDeleteTransaction={deleteTransaction}
      />}

      {view === 'goals' && <GoalsPage data={data} setData={setData} />}
      {view === 'settings' && <SettingsPage data={data} updateSettings={updateSettings} learnedNetPercent={learnedNetPercent} />}
    </main>

    {modal === 'income' && <IncomeModal
      item={editingIncome}
      settings={data.settings}
      onClose={() => { setModal(null); setEditingIncome(null) }}
      onSave={(item) => {
        setData((current) => ({
          ...current,
          income: editingIncome ? current.income.map((entry) => entry.id === item.id ? item : entry) : [...current.income, item],
        }))
        setModal(null)
        setEditingIncome(null)
      }}
    />}

    {modal === 'bill' && <BillModal
      bill={editingBill}
      onClose={() => { setModal(null); setEditingBill(null) }}
      onSave={(bill) => {
        setData((current) => ({
          ...current,
          bills: editingBill ? current.bills.map((entry) => entry.id === bill.id ? bill : entry) : [...current.bills, bill],
        }))
        setModal(null)
        setEditingBill(null)
      }}
    />}

    {modal === 'spending' && <TransactionModal
      mode="spent"
      onClose={() => setModal(null)}
      onSave={(transaction) => {
        setData((current) => ({ ...current, transactions: [...current.transactions, transaction] }))
        setModal(null)
      }}
    />}

    {modal === 'planned' && <TransactionModal
      mode="planned"
      onClose={() => setModal(null)}
      onSave={(transaction) => {
        setData((current) => ({ ...current, transactions: [...current.transactions, transaction] }))
        setModal(null)
      }}
    />}

    {modal === 'actual' && actualTarget && <ActualPayModal
      occurrence={actualTarget}
      onClose={() => { setModal(null); setActualTarget(null) }}
      onSave={(actual) => {
        setData((current) => ({
          ...current,
          income: current.income.map((item) => item.id === actualTarget.item.id
            ? { ...item, actuals: { ...(item.actuals || {}), [actualTarget.date]: actual } }
            : item),
        }))
        setModal(null)
        setActualTarget(null)
      }}
    />}
  </div>
}

function SetupScreen({ data, setData }) {
  const [kind, setKind] = useState('paycheck')
  const [recurrence, setRecurrence] = useState('biweekly')
  const [firstDate, setFirstDate] = useState(todayIso())
  const [payMode, setPayMode] = useState('hourly')
  const [hourlyRate, setHourlyRate] = useState(data.settings.hourlyRate || 22.28)
  const [regularHours, setRegularHours] = useState(80)
  const [amount, setAmount] = useState('')

  const finish = (skip = false) => {
    const income = skip ? [] : [{
      id: uid('income'),
      name: kind === 'paycheck' ? 'Paycheck' : 'Income',
      kind,
      recurrence,
      firstDate,
      payMode,
      hourlyRate: Number(hourlyRate || 0),
      regularHours: Number(regularHours || 0),
      overtimeHours: 0,
      overtimeMultiplier: 1.5,
      amount: Number(amount || 0),
      expectedNet: payMode === 'fixed' ? Number(amount || 0) : 0,
      actuals: {},
    }]
    setData((current) => ({ ...current, setupComplete: true, income: [...current.income, ...income] }))
  }

  return <main className="setup-page">
    <section className="setup-panel">
      <div className="brand-lockup"><div className="brand-mark large">P</div><strong>Paycheck Budget</strong></div>
      <div className="setup-heading"><h1>Add your primary income</h1><p>You can add bills and other income after setup.</p></div>
      <div className="form-stack">
        <Field label="Income type"><Segmented value={kind} onChange={setKind} options={[[ 'paycheck', 'Paycheck' ], [ 'other', 'Other' ]]} /></Field>
        <Field label="Schedule"><Segmented value={recurrence} onChange={setRecurrence} options={[[ 'once', 'One-time' ], [ 'weekly', 'Weekly' ], [ 'biweekly', 'Every 2 weeks' ], [ 'monthly', 'Monthly' ]]} /></Field>
        <Field label={recurrence === 'once' ? 'Date' : 'First payment'}><input type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} /></Field>
        {kind === 'paycheck' && <Field label="Pay type"><Segmented value={payMode} onChange={setPayMode} options={[[ 'hourly', 'Hourly' ], [ 'fixed', 'Fixed net' ]]} /></Field>}
        {kind === 'paycheck' && payMode === 'hourly' ? <div className="form-grid two"><Field label="Hourly rate"><input type="number" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} /></Field><Field label="Typical hours"><input type="number" step="0.1" value={regularHours} onChange={(event) => setRegularHours(event.target.value)} /></Field></div> : <Field label="Amount"><input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>}
      </div>
      <div className="setup-actions"><button className="secondary-button" onClick={() => finish(true)}>Skip</button><button className="primary-button" onClick={() => finish(false)}>Continue</button></div>
    </section>
  </main>
}

function Dashboard({ nextIncome, cycleEnd, safeToSpend, billsTotal, plannedTotal, spentTotal, rows, markBillPaid, onAddIncome, onAddBill, onAddSpending }) {
  return <div className="page">
    <header className="page-head compact">
      <div><h1>Dashboard</h1>{nextIncome && <p>{shortDate(nextIncome.date)} – {shortDate(cycleEnd)}</p>}</div>
      <div className="quick-actions"><button onClick={onAddIncome}>+ Income</button><button onClick={onAddBill}>+ Bill</button><button onClick={onAddSpending}>+ Spending</button></div>
    </header>

    <section className="balance-strip">
      <div className="balance-primary"><span>Safe to spend</span><strong className={safeToSpend < 0 ? 'negative' : ''}>{money(safeToSpend)}</strong></div>
      <div className="balance-stat"><span>Next income</span><strong>{money(nextIncome?.amount || 0)}</strong><small>{nextIncome ? shortDate(nextIncome.date) : 'Not scheduled'}</small></div>
      <div className="balance-stat"><span>Bills</span><strong>{money(billsTotal)}</strong></div>
      <div className="balance-stat"><span>Planned</span><strong>{money(plannedTotal)}</strong></div>
      <div className="balance-stat"><span>Spent</span><strong>{money(spentTotal)}</strong></div>
    </section>

    <section className="section-block">
      <div className="section-head"><h2>Upcoming</h2><span>{rows.length} items</span></div>
      {rows.length ? <div className="finance-list">
        {rows.map((row) => <div className={`finance-row ${row.paid ? 'muted-row' : ''}`} key={row.key}>
          <div className="row-date"><strong>{shortDate(row.date)}</strong></div>
          <div className="row-main"><strong>{row.name}</strong><span>{row.category}</span></div>
          <div className="row-amount">{money(row.amount)}</div>
          <div className="row-action">{row.type === 'bill' && <button className="small-button" onClick={() => markBillPaid(row.occurrence)}>{row.paid ? 'Paid' : 'Mark paid'}</button>}</div>
        </div>)}
      </div> : <EmptyState title="Nothing scheduled for this pay period." />}
    </section>
  </div>
}

function IncomePage({ tab, setTab, income, occurrences, effectiveNetPercent, learnedNetPercent, onAdd, onEdit, onDelete, onRecord }) {
  const now = todayIso()
  const future = occurrences.filter((occurrence) => occurrence.date >= now).slice(0, 8)
  const history = occurrences.filter((occurrence) => occurrence.date < now || occurrence.actual).slice(-20).reverse()
  const shownItems = tab === 'recurring' ? income.filter((item) => item.recurrence !== 'once') : income.filter((item) => item.recurrence === 'once')

  return <div className="page">
    <header className="page-head"><div><h1>Income</h1></div><button className="primary-button" onClick={onAdd}><Icon name="plus" />Add income</button></header>
    <Tabs value={tab} onChange={setTab} items={[[ 'overview', 'Overview' ], [ 'recurring', 'Recurring' ], [ 'one-time', 'One-time' ], [ 'history', 'History' ]]} />

    {tab === 'overview' && <>
      <section className="summary-line">
        <div><span>Next deposit</span><strong>{money(future[0]?.amount || 0)}</strong><small>{future[0] ? `${future[0].item.name} · ${shortDate(future[0].date)}` : 'Not scheduled'}</small></div>
        <div><span>Net rate</span><strong>{effectiveNetPercent.toFixed(1)}%</strong><small>{learnedNetPercent != null ? 'Based on actual pay' : 'Current estimate'}</small></div>
        <div><span>Sources</span><strong>{income.length}</strong></div>
      </section>
      <section className="section-block"><div className="section-head"><h2>Upcoming income</h2></div>{future.length ? <div className="finance-list">{future.map((occurrence) => <IncomeOccurrenceRow key={occurrence.key} occurrence={occurrence} onRecord={onRecord} />)}</div> : <EmptyState title="No income scheduled." action="Add income" onAction={onAdd} />}</section>
    </>}

    {(tab === 'recurring' || tab === 'one-time') && <section className="section-block flush-top">
      {shownItems.length ? <div className="finance-list">{shownItems.map((item) => <div className="finance-row" key={item.id}>
        <div className="row-icon"><Icon name="income" /></div>
        <div className="row-main"><strong>{item.name}</strong><span>{recurrenceLabel(item.recurrence, item.firstDate)} · {item.kind === 'paycheck' ? 'Paycheck' : 'Other income'}</span></div>
        <div className="row-amount">{item.kind === 'paycheck' && item.payMode === 'hourly' ? `${money(item.hourlyRate)}/hr` : money(item.amount || item.expectedNet)}</div>
        <div className="row-action action-pair"><button className="text-button" onClick={() => onEdit(item)}>Edit</button><button className="text-button danger" onClick={() => onDelete(item.id)}>Delete</button></div>
      </div>)}</div> : <EmptyState title={`No ${tab === 'recurring' ? 'recurring' : 'one-time'} income.`} action="Add income" onAction={onAdd} />}
    </section>}

    {tab === 'history' && <section className="section-block flush-top">
      {history.length ? <div className="finance-list">{history.map((occurrence) => <IncomeOccurrenceRow key={occurrence.key} occurrence={occurrence} onRecord={onRecord} />)}</div> : <EmptyState title="No income history yet." />}
    </section>}
  </div>
}

function IncomeOccurrenceRow({ occurrence, onRecord }) {
  return <div className="finance-row">
    <div className="row-date"><strong>{shortDate(occurrence.date)}</strong></div>
    <div className="row-main"><strong>{occurrence.item.name}</strong><span>{occurrence.actual?.actualNet != null ? 'Actual deposit' : 'Estimated'}</span></div>
    <div className="row-amount">{money(occurrence.amount)}</div>
    <div className="row-action">{occurrence.item.kind === 'paycheck' && <button className="small-button" onClick={() => onRecord(occurrence)}>{occurrence.actual?.actualNet != null ? 'Edit actual' : 'Record actual'}</button>}</div>
  </div>
}

function ExpensesPage({ tab, setTab, bills, billOccurrences, transactions, onAddBill, onEditBill, onDeleteBill, onTogglePaid, onAddSpending, onAddPlanned, onDeleteTransaction }) {
  const spending = transactions.filter((transaction) => transaction.type === 'spent').sort((a, b) => b.date.localeCompare(a.date))
  const planned = transactions.filter((transaction) => transaction.type === 'planned').sort((a, b) => a.date.localeCompare(b.date))
  const upcomingBills = billOccurrences.filter((occurrence) => occurrence.date >= todayIso()).slice(0, 12)
  const monthlyBillEstimate = bills.reduce((sum, bill) => {
    const amount = Number(bill.amount || 0)
    if (bill.scheduleType === 'weekly') return sum + amount * 52 / 12
    if (bill.scheduleType === 'biweekly') return sum + amount * 26 / 12
    if (bill.scheduleType === 'monthly') return sum + amount
    return sum
  }, 0)

  return <div className="page">
    <header className="page-head"><div><h1>Expenses</h1></div><div className="page-actions"><button className="secondary-button" onClick={onAddSpending}>+ Spending</button><button className="primary-button" onClick={onAddBill}>+ Bill</button></div></header>
    <Tabs value={tab} onChange={setTab} items={[[ 'overview', 'Overview' ], [ 'bills', 'Bills' ], [ 'spending', 'Spending' ], [ 'planned', 'Planned' ]]} />

    {tab === 'overview' && <>
      <section className="summary-line"><div><span>Recurring bills</span><strong>{money(monthlyBillEstimate)}</strong><small>Approx. monthly</small></div><div><span>Recent spending</span><strong>{money(spending.slice(0, 10).reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong><small>Last 10 entries</small></div><div><span>Planned</span><strong>{money(planned.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong></div></section>
      <section className="section-block"><div className="section-head"><h2>Upcoming bills</h2></div>{upcomingBills.length ? <div className="finance-list">{upcomingBills.map((occurrence) => <BillOccurrenceRow key={occurrence.key} occurrence={occurrence} onTogglePaid={onTogglePaid} />)}</div> : <EmptyState title="No upcoming bills." action="Add bill" onAction={onAddBill} />}</section>
    </>}

    {tab === 'bills' && <section className="section-block flush-top">
      {bills.length ? <div className="finance-list">{bills.map((bill) => <div className="finance-row" key={bill.id}>
        <div className="row-icon"><Icon name="expenses" /></div>
        <div className="row-main"><strong>{bill.name}</strong><span>{recurrenceLabel(bill.scheduleType, bill.anchorDate || bill.dueDate)} · {bill.category || 'Other'}</span></div>
        <div className="row-amount">{money(bill.amount)}</div>
        <div className="row-action action-pair"><button className="text-button" onClick={() => onEditBill(bill)}>Edit</button><button className="text-button danger" onClick={() => onDeleteBill(bill.id)}>Delete</button></div>
      </div>)}</div> : <EmptyState title="No bills added." action="Add bill" onAction={onAddBill} />}
    </section>}

    {tab === 'spending' && <section className="section-block flush-top">
      <div className="section-head"><h2>Spending</h2><button className="small-button" onClick={onAddSpending}>Add spending</button></div>
      {spending.length ? <div className="finance-list">{spending.map((item) => <TransactionRow key={item.id} item={item} onDelete={onDeleteTransaction} />)}</div> : <EmptyState title="No spending recorded." action="Add spending" onAction={onAddSpending} />}
    </section>}

    {tab === 'planned' && <section className="section-block flush-top">
      <div className="section-head"><h2>Planned purchases</h2><button className="small-button" onClick={onAddPlanned}>Add planned</button></div>
      {planned.length ? <div className="finance-list">{planned.map((item) => <TransactionRow key={item.id} item={item} onDelete={onDeleteTransaction} />)}</div> : <EmptyState title="No planned purchases." action="Add planned" onAction={onAddPlanned} />}
    </section>}
  </div>
}

function BillOccurrenceRow({ occurrence, onTogglePaid }) {
  return <div className={`finance-row ${occurrence.paid ? 'muted-row' : ''}`}>
    <div className="row-date"><strong>{shortDate(occurrence.date)}</strong></div>
    <div className="row-main"><strong>{occurrence.bill.name}</strong><span>{occurrence.bill.category || 'Bill'}</span></div>
    <div className="row-amount">{money(occurrence.bill.amount)}</div>
    <div className="row-action"><button className="small-button" onClick={() => onTogglePaid(occurrence)}>{occurrence.paid ? 'Paid' : 'Mark paid'}</button></div>
  </div>
}

function TransactionRow({ item, onDelete }) {
  return <div className="finance-row">
    <div className="row-date"><strong>{shortDate(item.date)}</strong></div>
    <div className="row-main"><strong>{item.name || item.category}</strong><span>{item.category || (item.type === 'planned' ? 'Planned' : 'Spending')}</span></div>
    <div className="row-amount">{money(item.amount)}</div>
    <div className="row-action"><button className="text-button danger" onClick={() => onDelete(item.id)}>Delete</button></div>
  </div>
}

function IncomeModal({ item, settings, onClose, onSave }) {
  const [kind, setKind] = useState(item?.kind || 'paycheck')
  const [recurrence, setRecurrence] = useState(item?.recurrence || 'once')
  const [firstDate, setFirstDate] = useState(item?.firstDate || todayIso())
  const [name, setName] = useState(item?.name || 'Paycheck')
  const [payMode, setPayMode] = useState(item?.payMode || 'hourly')
  const [hourlyRate, setHourlyRate] = useState(item?.hourlyRate ?? settings.hourlyRate)
  const [regularHours, setRegularHours] = useState(item?.regularHours ?? 80)
  const [overtimeHours, setOvertimeHours] = useState(item?.overtimeHours ?? 0)
  const [amount, setAmount] = useState(item?.amount ?? item?.expectedNet ?? '')

  useEffect(() => {
    if (!item) setName(kind === 'paycheck' ? 'Paycheck' : 'Income')
  }, [kind, item])

  const submit = (event) => {
    event.preventDefault()
    onSave({
      ...(item || {}),
      id: item?.id || uid('income'),
      name: name.trim() || (kind === 'paycheck' ? 'Paycheck' : 'Income'),
      kind,
      recurrence,
      firstDate,
      payMode,
      hourlyRate: Number(hourlyRate || 0),
      regularHours: Number(regularHours || 0),
      overtimeHours: Number(overtimeHours || 0),
      overtimeMultiplier: Number(item?.overtimeMultiplier || settings.overtimeMultiplier || 1.5),
      amount: Number(amount || 0),
      expectedNet: payMode === 'fixed' ? Number(amount || 0) : Number(item?.expectedNet || 0),
      actuals: item?.actuals || {},
    })
  }

  return <Modal title={item ? 'Edit income' : 'Add income'} onClose={onClose} wide>
    <form className="modal-form" onSubmit={submit}>
      <Field label="Income type"><Segmented value={kind} onChange={setKind} options={[[ 'paycheck', 'Paycheck' ], [ 'other', 'Other income' ]]} /></Field>
      <Field label="Schedule"><Segmented value={recurrence} onChange={setRecurrence} options={[[ 'once', 'One-time' ], [ 'weekly', 'Weekly' ], [ 'biweekly', 'Every 2 weeks' ], [ 'monthly', 'Monthly' ]]} /></Field>
      <div className="form-grid two"><Field label={recurrence === 'once' ? 'Date' : 'First payment'}><input type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} required /></Field><Field label="Name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field></div>
      {kind === 'paycheck' && <Field label="Pay type"><Segmented value={payMode} onChange={setPayMode} options={[[ 'hourly', 'Hourly' ], [ 'fixed', 'Fixed net' ]]} /></Field>}
      {kind === 'paycheck' && payMode === 'hourly' ? <div className="form-grid three"><Field label="Hourly rate"><input type="number" step="0.01" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} required /></Field><Field label="Regular hours"><input type="number" step="0.1" value={regularHours} onChange={(event) => setRegularHours(event.target.value)} /></Field><Field label="Typical OT"><input type="number" step="0.1" value={overtimeHours} onChange={(event) => setOvertimeHours(event.target.value)} /></Field></div> : <Field label="Amount"><input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save</button></div>
    </form>
  </Modal>
}

function BillModal({ bill, onClose, onSave }) {
  const [scheduleType, setScheduleType] = useState(bill?.scheduleType || 'once')
  const [firstDate, setFirstDate] = useState(bill?.anchorDate || bill?.dueDate || todayIso())
  const [name, setName] = useState(bill?.name || '')
  const [amount, setAmount] = useState(bill?.amount || '')
  const [category, setCategory] = useState(bill?.category || 'Utilities')

  const submit = (event) => {
    event.preventDefault()
    onSave({
      ...(bill || {}),
      id: bill?.id || uid('bill'),
      name: name.trim(),
      amount: Number(amount || 0),
      category,
      scheduleType,
      anchorDate: firstDate,
      dueDate: scheduleType === 'once' ? firstDate : firstDate,
      dayOfMonth: scheduleType === 'monthly' ? toDate(firstDate).getDate() : undefined,
      paidDates: bill?.paidDates || [],
    })
  }

  return <Modal title={bill ? 'Edit bill' : 'Add bill'} onClose={onClose} wide>
    <form className="modal-form" onSubmit={submit}>
      <Field label="Bill type"><Segmented value={scheduleType === 'once' ? 'once' : 'recurring'} onChange={(value) => setScheduleType(value === 'once' ? 'once' : 'monthly')} options={[[ 'once', 'One-time' ], [ 'recurring', 'Recurring' ]]} /></Field>
      {scheduleType !== 'once' && <Field label="Frequency"><Segmented value={scheduleType} onChange={setScheduleType} options={[[ 'weekly', 'Weekly' ], [ 'biweekly', 'Every 2 weeks' ], [ 'monthly', 'Monthly' ]]} /></Field>}
      <div className="form-grid two"><Field label="Bill name"><input value={name} onChange={(event) => setName(event.target.value)} required /></Field><Field label="Amount"><input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field></div>
      <div className="form-grid two"><Field label={scheduleType === 'once' ? 'Due date' : 'First due date'}><input type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} required /></Field><Field label="Category"><select value={category} onChange={(event) => setCategory(event.target.value)}>{BILL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
      {scheduleType !== 'once' && <div className="schedule-preview"><Icon name="calendar" /><span>Starts {shortDate(firstDate)} · {recurrenceLabel(scheduleType, firstDate)}</span></div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save</button></div>
    </form>
  </Modal>
}

function TransactionModal({ mode, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(mode === 'spent' ? 'Food' : 'Planned')
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayIso())
  const submit = (event) => {
    event.preventDefault()
    onSave({ id: uid('txn'), type: mode, amount: Number(amount || 0), category, name: name.trim() || category, date })
  }
  return <Modal title={mode === 'spent' ? 'Add spending' : 'Add planned purchase'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <Field label="Amount"><input className="amount-input" type="number" step="0.01" autoFocus value={amount} onChange={(event) => setAmount(event.target.value)} required /></Field>
      {mode === 'spent' ? <Field label="Category"><div className="chip-grid">{SPENDING_CATEGORIES.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></Field> : <Field label="Category"><input value={category} onChange={(event) => setCategory(event.target.value)} /></Field>}
      <Field label="Description"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Optional" /></Field>
      <Field label="Date"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Add</button></div>
    </form>
  </Modal>
}

function ActualPayModal({ occurrence, onClose, onSave }) {
  const existing = occurrence.actual || {}
  const [actualNet, setActualNet] = useState(existing.actualNet ?? '')
  const [regularHours, setRegularHours] = useState(existing.regularHours ?? occurrence.item.regularHours ?? 0)
  const [overtimeHours, setOvertimeHours] = useState(existing.overtimeHours ?? occurrence.item.overtimeHours ?? 0)
  const submit = (event) => {
    event.preventDefault()
    onSave({ actualNet: Number(actualNet || 0), regularHours: Number(regularHours || 0), overtimeHours: Number(overtimeHours || 0) })
  }
  return <Modal title={`Actual pay · ${shortDate(occurrence.date)}`} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <Field label="Actual net deposit"><input className="amount-input" type="number" step="0.01" value={actualNet} onChange={(event) => setActualNet(event.target.value)} required autoFocus /></Field>
      {occurrence.item.payMode !== 'fixed' && <div className="form-grid two"><Field label="Regular hours"><input type="number" step="0.1" value={regularHours} onChange={(event) => setRegularHours(event.target.value)} /></Field><Field label="Overtime hours"><input type="number" step="0.1" value={overtimeHours} onChange={(event) => setOvertimeHours(event.target.value)} /></Field></div>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save actual</button></div>
    </form>
  </Modal>
}

function GoalsPage({ data, setData }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const addGoal = (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setData((current) => ({ ...current, goals: [...current.goals, { id: uid('goal'), name: name.trim(), target: Number(target || 0), saved: 0 }] }))
    setName('')
    setTarget('')
  }
  return <div className="page"><header className="page-head"><div><h1>Goals</h1></div></header><section className="section-block flush-top">{data.goals.length ? <div className="goal-list">{data.goals.map((goal) => {
    const percent = Number(goal.target) > 0 ? Math.min(100, (Number(goal.saved || 0) / Number(goal.target)) * 100) : 0
    return <div className="goal-row" key={goal.id}><div className="goal-main"><strong>{goal.name}</strong><span>{money(goal.saved)} of {money(goal.target)}</span><div className="progress"><div style={{ width: `${percent}%` }} /></div></div><input type="number" step="0.01" value={goal.saved} onChange={(event) => setData((current) => ({ ...current, goals: current.goals.map((item) => item.id === goal.id ? { ...item, saved: Number(event.target.value || 0) } : item) }))} /><button className="text-button danger" onClick={() => setData((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== goal.id) }))}>Delete</button></div>
  })}</div> : <EmptyState title="No goals yet." />}</section><form className="inline-add" onSubmit={addGoal}><input placeholder="Goal name" value={name} onChange={(event) => setName(event.target.value)} /><input type="number" step="0.01" placeholder="Target" value={target} onChange={(event) => setTarget(event.target.value)} /><button className="primary-button">Add goal</button></form></div>
}

function SettingsPage({ data, updateSettings, learnedNetPercent }) {
  return <div className="page"><header className="page-head"><div><h1>Settings</h1></div></header>
    <section className="settings-section"><h2>Appearance</h2><div className="settings-row"><div><strong>Theme</strong></div><Segmented value={data.settings.themeMode} onChange={(themeMode) => updateSettings({ themeMode })} options={[[ 'dark', 'Dark' ], [ 'light', 'Light' ]]} /></div><div className="settings-row"><div><strong>Accent</strong></div><div className="color-options">{['mint', 'blue', 'purple', 'orange'].map((accent) => <button key={accent} className={`${accent} ${data.settings.accentTheme === accent ? 'selected' : ''}`} onClick={() => updateSettings({ accentTheme: accent })} aria-label={accent} />)}</div></div></section>
    <section className="settings-section"><h2>Income</h2><div className="settings-row"><div><strong>Default hourly rate</strong></div><input type="number" step="0.01" value={data.settings.hourlyRate} onChange={(event) => updateSettings({ hourlyRate: Number(event.target.value || 0) })} /></div><div className="settings-row"><div><strong>Estimated net rate</strong><span>{learnedNetPercent != null ? `Learned rate: ${learnedNetPercent.toFixed(1)}%` : ''}</span></div><input type="number" step="0.1" value={data.settings.estimatedNetPercent} onChange={(event) => updateSettings({ estimatedNetPercent: Number(event.target.value || 0) })} /></div><div className="settings-row"><div><strong>Learn from actual pay</strong></div><button className={`toggle ${data.settings.autoLearnNet ? 'on' : ''}`} onClick={() => updateSettings({ autoLearnNet: !data.settings.autoLearnNet })}><span /></button></div></section>
    <section className="settings-section"><h2>Account</h2><div className="settings-row"><div><strong>{auth.currentUser?.email}</strong></div><button className="secondary-button" onClick={() => signOut(auth)}>Sign out</button></div></section>
  </div>
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

export default App
