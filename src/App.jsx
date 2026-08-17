import React, { useEffect, useMemo, useState } from 'react'
import { initialData } from './data'
import { longDate, money, shortDate, uid, weekday } from './utils'

const STORAGE_KEY = 'paycheck-budget-v1'

function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    paychecks: <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/></>,
    bills: <><path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 9h6M9 13h6M9 17h3"/></>,
    transactions: <><path d="M7 7h12l-3-3M17 17H5l3 3"/><path d="M19 7l-3 3M5 17l3-3"/></>,
    goals: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.06.06-2.78 2.78-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .6 1.8 1.8 0 0 0-.4 1.17V21H10.4v-.09A1.8 1.8 0 0 0 9 19.4a1.8 1.8 0 0 0-1.98.36l-.06.06-2.78-2.78.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.6-1 1.8 1.8 0 0 0-1.17-.4H3V10.4h.09A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l-.06-.06 2.78-2.78.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.6 1.8 1.8 0 0 0 .4-1.17V3h3.2v.09A1.8 1.8 0 0 0 15 4.6a1.8 1.8 0 0 0 1.98-.36l.06-.06 2.78 2.78-.06.06A1.8 1.8 0 0 0 19.4 9c.14.4.37.74.68 1 .32.25.71.4 1.12.4H21v3.2h-.09A1.8 1.8 0 0 0 19.4 15Z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    wallet: <><path d="M4 6a2 2 0 0 1 2-2h12v16H6a2 2 0 0 1-2-2V6Z"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    reset: <><path d="M4 4v6h6"/><path d="M5.6 15A8 8 0 1 0 6 7.5L4 10"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    repeat: <><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  }
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const navItems = [
  ['dashboard', 'Dashboard'],
  ['paychecks', 'Income'],
  ['bills', 'Bills'],
  ['transactions', 'Transactions'],
  ['goals', 'Goals'],
  ['settings', 'Settings'],
]

const toDate = (iso) => new Date(`${iso}T12:00:00`)
const toIso = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const addDays = (iso, days) => {
  const d = toDate(iso)
  d.setDate(d.getDate() + days)
  return toIso(d)
}
const todayIso = () => toIso(new Date())

function normalizeData(raw) {
  const source = raw || initialData
  return {
    ...initialData,
    ...source,
    settings: { ...initialData.settings, ...(source.settings || {}) },
    paychecks: Array.isArray(source.paychecks) ? source.paychecks : initialData.paychecks,
    transactions: Array.isArray(source.transactions) ? source.transactions : initialData.transactions,
    goals: Array.isArray(source.goals) ? source.goals : initialData.goals,
    bills: (Array.isArray(source.bills) ? source.bills : initialData.bills).map((b) => ({
      ...b,
      scheduleType: b.scheduleType || 'once',
      paidDates: b.paidDates || (b.paid && b.dueDate ? [b.dueDate] : []),
    })),
  }
}

function lastDayOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function billOccurrences(bill, startIso, endIso) {
  if (!startIso || !endIso) return []
  const out = []
  const push = (date) => {
    if (date >= startIso && date <= endIso) out.push({ billId: bill.id, dueDate: date })
  }

  if (bill.scheduleType === 'once') {
    if (bill.dueDate) push(bill.dueDate)
    return out
  }

  const anchor = bill.anchorDate || bill.dueDate || startIso
  if (bill.scheduleType === 'weekly' || bill.scheduleType === 'biweekly') {
    const step = bill.scheduleType === 'weekly' ? 7 : 14
    let cursor = anchor
    while (cursor < startIso) cursor = addDays(cursor, step)
    while (cursor <= endIso) {
      push(cursor)
      cursor = addDays(cursor, step)
    }
    return out
  }

  if (bill.scheduleType === 'monthly') {
    const start = toDate(startIso)
    const end = toDate(endIso)
    const day = Math.max(1, Math.min(31, Number(bill.dayOfMonth || toDate(anchor).getDate())))
    let year = start.getFullYear()
    let month = start.getMonth()
    while (year < end.getFullYear() || (year === end.getFullYear() && month <= end.getMonth())) {
      const date = new Date(year, month, Math.min(day, lastDayOfMonth(year, month)))
      const iso = toIso(date)
      if (iso >= anchor) push(iso)
      month += 1
      if (month > 11) { month = 0; year += 1 }
    }
    return out
  }

  if (bill.scheduleType === 'yearly') {
    const a = toDate(anchor)
    const start = toDate(startIso)
    const end = toDate(endIso)
    for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
      const date = new Date(year, a.getMonth(), Math.min(a.getDate(), lastDayOfMonth(year, a.getMonth())))
      const iso = toIso(date)
      if (iso >= anchor) push(iso)
    }
  }
  return out
}

function scheduleLabel(bill) {
  if (bill.scheduleType === 'monthly') return `Monthly on the ${ordinal(Number(bill.dayOfMonth || 1))}`
  if (bill.scheduleType === 'weekly') return `Every ${weekday(bill.anchorDate || bill.dueDate)}`
  if (bill.scheduleType === 'biweekly') return `Every other ${weekday(bill.anchorDate || bill.dueDate)}`
  if (bill.scheduleType === 'yearly') return `Yearly on ${shortDate(bill.anchorDate || bill.dueDate)}`
  return 'One-time payment'
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" /></button></div>
      {children}
    </div>
  </div>
}

function Progress({ value }) {
  return <div className="progress"><div style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
}

function App() {
  const [data, setData] = useState(() => {
    try { return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY))) } catch { return normalizeData(initialData) }
  })
  const [view, setView] = useState('dashboard')
  const [selectedPaycheckId, setSelectedPaycheckId] = useState(data.paychecks[0]?.id)
  const [modal, setModal] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [purchaseAmount, setPurchaseAmount] = useState('')

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(data)), [data])

  const sortedPaychecks = useMemo(() => [...data.paychecks].sort((a, b) => a.date.localeCompare(b.date)), [data.paychecks])
  const selected = sortedPaychecks.find(p => p.id === selectedPaycheckId) || sortedPaychecks[0]

  const paycheckWindow = (paycheck) => {
    const index = sortedPaychecks.findIndex(p => p.id === paycheck.id)
    const next = sortedPaychecks[index + 1]
    return { start: paycheck.date, end: next ? addDays(next.date, -1) : addDays(paycheck.date, 13) }
  }

  const occurrencesForPaycheck = (paycheck) => {
    if (!paycheck) return []
    const { start, end } = paycheckWindow(paycheck)
    return data.bills.flatMap(bill => billOccurrences(bill, start, end).map(o => ({ ...o, bill })))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }

  const selectedOccurrences = useMemo(() => selected ? occurrencesForPaycheck(selected) : [], [selected, data.bills, sortedPaychecks])

  const grossForPaycheck = (paycheck) => paycheck
    ? Number(paycheck.regularHours || 0) * data.settings.hourlyRate + Number(paycheck.overtimeHours || 0) * data.settings.hourlyRate * data.settings.overtimeMultiplier
    : 0

  const actualPaychecks = sortedPaychecks.filter(p => p.actualNet != null && grossForPaycheck(p) > 0)
  const learnedNetPercent = actualPaychecks.length
    ? (actualPaychecks.reduce((sum, p) => sum + Number(p.actualNet), 0) / actualPaychecks.reduce((sum, p) => sum + grossForPaycheck(p), 0)) * 100
    : null
  const effectiveNetPercent = data.settings.autoLearnNet !== false && learnedNetPercent != null
    ? learnedNetPercent
    : Number(data.settings.estimatedNetPercent || 0)

  const projectedNetForPaycheck = (paycheck) => {
    if (!paycheck) return 0
    if (paycheck.actualNet != null) return Number(paycheck.actualNet)
    const calculatedGross = grossForPaycheck(paycheck)
    if (calculatedGross > 0) return calculatedGross * (effectiveNetPercent / 100)
    return Number(paycheck.expectedNet || 0)
  }

  const paycheckStats = useMemo(() => {
    if (!selected) return { net: 0, bills: 0, planned: 0, safe: 0 }
    const net = projectedNetForPaycheck(selected)
    const bills = selectedOccurrences.filter(o => !o.bill.paidDates.includes(o.dueDate)).reduce((s, o) => s + Number(o.bill.amount), 0)
    const planned = data.transactions.filter(t => t.paycheckId === selected.id && t.type === 'planned').reduce((s, t) => s + Number(t.amount), 0)
    return { net, bills, planned, safe: net - bills - planned }
  }, [selected, selectedOccurrences, data.transactions, effectiveNetPercent, data.settings.hourlyRate, data.settings.overtimeMultiplier])

  const gross = grossForPaycheck(selected)
  const estimatedFromHours = gross * (effectiveNetPercent / 100)
  const afterPurchase = paycheckStats.safe - Number(purchaseAmount || 0)

  const upcomingOccurrences = useMemo(() => {
    const start = todayIso()
    const end = sortedPaychecks.length ? addDays(sortedPaychecks.at(-1).date, 60) : addDays(start, 90)
    return data.bills.flatMap(bill => billOccurrences(bill, start, end).map(o => ({ ...o, bill })))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [data.bills, sortedPaychecks])

  const nextDueFor = (bill) => {
    const start = todayIso()
    return billOccurrences(bill, start, addDays(start, 370))[0]?.dueDate || null
  }

  const update = (key, id, patch) => setData(d => ({ ...d, [key]: d[key].map(item => item.id === id ? { ...item, ...patch } : item) }))
  const remove = (key, id) => setData(d => ({ ...d, [key]: d[key].filter(item => item.id !== id) }))

  const toggleOccurrencePaid = (billId, dueDate) => {
    setData(d => ({
      ...d,
      bills: d.bills.map(b => {
        if (b.id !== billId) return b
        const paidDates = b.paidDates || []
        return { ...b, paidDates: paidDates.includes(dueDate) ? paidDates.filter(x => x !== dueDate) : [...paidDates, dueDate] }
      }),
    }))
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetData = () => {
    if (confirm('Reset your budget back to the original sample data?')) {
      setData(normalizeData(initialData))
      setSelectedPaycheckId(initialData.paychecks[0].id)
      setView('dashboard')
    }
  }

  const saveBill = (item) => {
    setData(d => ({
      ...d,
      bills: editingBill ? d.bills.map(b => b.id === editingBill.id ? { ...item, id: editingBill.id, paidDates: editingBill.paidDates || [] } : b) : [...d.bills, item],
    }))
    setEditingBill(null)
    setModal(null)
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">P</div><div><strong>Paycheck</strong><span>Budget</span></div></div>
      <nav>{navItems.map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon name={id}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-foot"><span>Private budget</span><small>Your plan, bills, and goals in one place.</small></div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div><span className="eyebrow">PERSONAL BUDGET</span><h1>{navItems.find(n => n[0] === view)?.[1]}</h1></div>
        <div className="top-actions">
          <select value={selectedPaycheckId} onChange={e => setSelectedPaycheckId(e.target.value)}>
            {sortedPaychecks.map(p => <option key={p.id} value={p.id}>{shortDate(p.date)} · {money(projectedNetForPaycheck(p))}</option>)}
          </select>
          <button className="primary" onClick={() => setModal('transaction')}><Icon name="plus"/> Add expense</button>
        </div>
      </header>

      {view === 'dashboard' && <>
        <section className="hero-grid">
          <div className="safe-card">
            <div className="safe-top"><span>SAFE TO SPEND</span><div className={`status ${paycheckStats.safe >= data.settings.safetyBuffer ? 'good' : 'warn'}`}>{paycheckStats.safe >= data.settings.safetyBuffer ? 'On track' : 'Below buffer'}</div></div>
            <div className="safe-amount">{money(paycheckStats.safe)}</div>
            <p>What remains from {selected?.label} after upcoming bills and planned purchases.</p>
            <div className="safe-breakdown">
              <div><span>Income</span><strong>{money(paycheckStats.net)}</strong></div>
              <div><span>Bills</span><strong>−{money(paycheckStats.bills)}</strong></div>
              <div><span>Planned</span><strong>−{money(paycheckStats.planned)}</strong></div>
            </div>
          </div>

          <div className="card paycheck-card">
            <div className="card-title"><div><span className="eyebrow">SELECTED PAYCHECK</span><h2>{selected?.label}</h2></div><Icon name="wallet"/></div>
            <div className="big-secondary">{money(projectedNetForPaycheck(selected))}</div>
            <p>{selected ? longDate(selected.date) : ''}</p>
            <div className="mini-grid"><div><span>Gross estimate</span><b>{money(gross)}</b></div><div><span>Take-home estimate</span><b>{money(estimatedFromHours)}</b></div></div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="card span-2">
            <div className="section-head"><div><span className="eyebrow">CASH FLOW</span><h2>Paycheck timeline</h2></div><button className="text-btn" onClick={() => setView('paychecks')}>View income</button></div>
            <div className="timeline">
              {sortedPaychecks.slice(0, 4).map((p, i) => {
                const occurrences = occurrencesForPaycheck(p)
                const bills = occurrences.filter(o => !o.bill.paidDates.includes(o.dueDate)).reduce((s, o) => s + Number(o.bill.amount), 0)
                const planned = data.transactions.filter(t => t.paycheckId === p.id && t.type === 'planned').reduce((s, t) => s + Number(t.amount), 0)
                const remain = projectedNetForPaycheck(p) - bills - planned
                return <button key={p.id} onClick={() => setSelectedPaycheckId(p.id)} className={`timeline-item ${p.id === selectedPaycheckId ? 'selected' : ''}`}>
                  <div className="timeline-dot">{i + 1}</div><span>{shortDate(p.date)}</span><strong>{money(remain)}</strong><small>projected left</small>
                </button>
              })}
            </div>
          </div>

          <div className="card afford-card">
            <span className="eyebrow">QUICK CHECK</span><h2>Can I afford it?</h2>
            <label>Purchase amount<div className="money-input"><span>$</span><input inputMode="decimal" placeholder="0.00" value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value.replace(/[^0-9.]/g, ''))}/></div></label>
            <div className={`afford-result ${afterPurchase >= data.settings.safetyBuffer ? 'good' : 'warn'}`}>
              <span>Safe after purchase</span><strong>{money(afterPurchase)}</strong><small>{afterPurchase >= data.settings.safetyBuffer ? `Your ${money(data.settings.safetyBuffer)} buffer stays protected.` : `This would take you below your ${money(data.settings.safetyBuffer)} buffer.`}</small>
            </div>
          </div>

          <div className="card span-2">
            <div className="section-head"><div><span className="eyebrow">THIS PAYCHECK</span><h2>Upcoming bills & plans</h2></div><button className="text-btn" onClick={() => { setEditingBill(null); setModal('bill') }}><Icon name="plus"/> Add bill</button></div>
            <div className="item-list">
              {selectedOccurrences.length === 0 && data.transactions.filter(t => t.paycheckId === selectedPaycheckId && t.type === 'planned').length === 0 && <div className="empty-state">Nothing is committed to this paycheck yet.</div>}
              {selectedOccurrences.map(({ bill, dueDate }) => {
                const paid = bill.paidDates.includes(dueDate)
                return <div className="list-row" key={`${bill.id}-${dueDate}`}>
                  <button className={`check ${paid ? 'done' : ''}`} onClick={() => toggleOccurrencePaid(bill.id, dueDate)}>{paid && <Icon name="check"/>}</button>
                  <div className="row-main"><strong>{bill.name}</strong><span>{shortDate(dueDate)} · {bill.category} · {scheduleLabel(bill)}</span></div>
                  <strong>{money(bill.amount)}</strong>
                </div>
              })}
              {data.transactions.filter(t => t.paycheckId === selectedPaycheckId && t.type === 'planned').map(t => <div className="list-row" key={t.id}><div className="planned-dot"/><div className="row-main"><strong>{t.name}</strong><span>{shortDate(t.date)} · Planned purchase</span></div><strong>{money(t.amount)}</strong></div>)}
            </div>
          </div>

          <div className="card">
            <div className="section-head"><div><span className="eyebrow">GOALS</span><h2>What you're building toward</h2></div><button className="text-btn" onClick={() => setView('goals')}>View all</button></div>
            <div className="goal-stack">{data.goals.slice(0, 3).map(g => <div className="goal-mini" key={g.id}><div><strong>{g.name}</strong><span>{money(g.saved)} / {money(g.target)}</span></div><Progress value={(g.saved / g.target) * 100}/></div>)}</div>
          </div>
        </section>
      </>}

      {view === 'paychecks' && <section className="income-layout">
        <div className="income-summary-grid">
          <div className="metric-card"><span>Selected deposit</span><strong>{money(projectedNetForPaycheck(selected))}</strong><small>{selected?.actualNet != null ? 'Actual deposit received' : `Projected for ${selected ? longDate(selected.date) : ''}`}</small></div>
          <div className="metric-card"><span>Gross estimate</span><strong>{money(gross)}</strong><small>{Number(selected?.regularHours || 0) + Number(selected?.overtimeHours || 0)} total hours · {Number(selected?.overtimeHours || 0)} OT</small></div>
          <div className="metric-card"><span>{learnedNetPercent != null ? 'Learned take-home rate' : 'Starting take-home rate'}</span><strong>{effectiveNetPercent.toFixed(1)}%</strong><small>{learnedNetPercent != null ? `Based on ${actualPaychecks.length} actual paycheck${actualPaychecks.length === 1 ? '' : 's'}` : 'Updates after you enter an actual deposit'}</small></div>
          <div className="metric-card"><span>Pay schedule</span><strong>{data.settings.payFrequency}</strong><small>Income planning cadence</small></div>
        </div>

        <div className="page-grid income-main-grid">
          <div className="card full-card">
            <div className="section-head"><div><span className="eyebrow">PAY HISTORY & FORECAST</span><h2>Paychecks</h2></div><button className="primary small" onClick={() => setModal('paycheck')}><Icon name="plus"/> Add paycheck</button></div>
            <div className="income-list">
              {sortedPaychecks.map(p => {
                const isSelected = p.id === selectedPaycheckId
                const pGross = grossForPaycheck(p)
                return <button key={p.id} className={`income-row ${isSelected ? 'selected' : ''}`} onClick={() => setSelectedPaycheckId(p.id)}>
                  <div className="income-date"><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(toDate(p.date)).toUpperCase()}</span><strong>{toDate(p.date).getDate()}</strong></div>
                  <div className="income-primary"><strong>{p.label}</strong><span>{Number(p.regularHours || 0)} regular hrs · {Number(p.overtimeHours || 0)} OT hrs</span></div>
                  <div className="income-stat"><span>Gross</span><strong>{money(pGross)}</strong></div>
                  <div className="income-stat"><span>{p.actualNet != null ? 'Take-home' : 'Projected'}</span><strong>{money(projectedNetForPaycheck(p))}</strong></div>
                  <div className={`income-status ${p.actualNet != null ? 'received' : 'expected'}`}>{p.actualNet != null ? 'Received' : 'Expected'}</div>
                </button>
              })}
            </div>
          </div>

          <div className="card income-editor">
            <span className="eyebrow">PAYCHECK DETAILS</span><h2>{selected?.label}</h2>
            <p className="muted">Enter your hours and, once the check arrives, record the actual deposit. Future paycheck forecasts will learn from your real take-home rate automatically.</p>
            <div className="learning-note">
              <div><span>{selected?.actualNet != null ? 'Actual paycheck recorded' : 'Automatic projection'}</span><strong>{selected?.actualNet != null ? `${((Number(selected.actualNet) / Math.max(gross, .01)) * 100).toFixed(1)}% of gross reached your account` : `${effectiveNetPercent.toFixed(1)}% of gross is being used for this forecast`}</strong></div>
              <small>{learnedNetPercent != null ? `Your forecast is currently learned from ${actualPaychecks.length} actual paycheck${actualPaychecks.length === 1 ? '' : 's'}.` : 'Enter your first actual deposit and the app will begin learning your take-home percentage.'}</small>
            </div>
            <div className="form-grid one polished-form">
              <label><span>Projected deposit</span><div className="field-prefix readonly-field"><span>$</span><input readOnly value={projectedNetForPaycheck(selected).toFixed(2)}/></div><small className="field-help">Calculated from hours, pay rate, overtime, and your learned take-home percentage.</small></label>
              <label><span>Actual deposit <em>optional</em></span><div className="field-prefix"><span>$</span><input type="number" step="0.01" placeholder="Enter when your paycheck arrives" value={selected?.actualNet ?? ''} onChange={e => update('paychecks', selected.id, { actualNet: e.target.value === '' ? null : Number(e.target.value) })}/></div></label>
              <div className="hours-grid">
                <label><span>Regular hours</span><input type="number" step="0.1" value={selected?.regularHours ?? 0} onChange={e => update('paychecks', selected.id, { regularHours: Number(e.target.value) })}/></label>
                <label><span>Overtime hours</span><input type="number" step="0.1" value={selected?.overtimeHours ?? 0} onChange={e => update('paychecks', selected.id, { overtimeHours: Number(e.target.value) })}/></label>
              </div>
            </div>
            <div className="income-calculation">
              <div><span>Hourly rate</span><strong>{money(data.settings.hourlyRate)}</strong></div>
              <div><span>Calculated gross</span><strong>{money(gross)}</strong></div>
              <div className="highlight"><span>{selected?.actualNet != null ? 'Actual take-home' : 'Projected take-home'}</span><strong>{money(projectedNetForPaycheck(selected))}</strong></div><div><span>Forecast rate</span><strong>{effectiveNetPercent.toFixed(1)}%</strong></div>
            </div>
          </div>
        </div>
      </section>}

      {view === 'bills' && <section className="bills-page">
        <div className="bill-summary-grid">
          <div className="metric-card"><span>Active bills</span><strong>{data.bills.length}</strong><small>Recurring and one-time</small></div>
          <div className="metric-card"><span>Due this paycheck</span><strong>{money(selectedOccurrences.filter(o => !o.bill.paidDates.includes(o.dueDate)).reduce((s, o) => s + Number(o.bill.amount), 0))}</strong><small>{selected?.label}</small></div>
          <div className="metric-card"><span>Next due</span><strong>{upcomingOccurrences[0] ? money(upcomingOccurrences[0].bill.amount) : '—'}</strong><small>{upcomingOccurrences[0] ? `${upcomingOccurrences[0].bill.name} · ${shortDate(upcomingOccurrences[0].dueDate)}` : 'No upcoming bills'}</small></div>
        </div>

        <div className="page-grid bills-main-grid">
          <div className="card full-card">
            <div className="section-head"><div><span className="eyebrow">AUTOMATIC SCHEDULES</span><h2>Your bills</h2><p className="section-subtitle">Set a bill once and future due dates are generated automatically.</p></div><button className="primary small" onClick={() => { setEditingBill(null); setModal('bill') }}><Icon name="plus"/> Add bill</button></div>
            <div className="bill-cards">
              {data.bills.map(b => {
                const next = nextDueFor(b)
                return <div className="bill-card" key={b.id}>
                  <div className="bill-icon"><Icon name={b.scheduleType === 'once' ? 'calendar' : 'repeat'}/></div>
                  <div className="bill-card-main"><strong>{b.name}</strong><span>{b.category}</span><small>{scheduleLabel(b)}</small></div>
                  <div className="bill-next"><span>Next due</span><strong>{next ? shortDate(next) : 'Complete'}</strong></div>
                  <div className="bill-amount">{money(b.amount)}</div>
                  <div className="bill-actions"><button title="Edit" onClick={() => { setEditingBill(b); setModal('bill') }}><Icon name="edit"/></button><button title="Delete" onClick={() => remove('bills', b.id)}>×</button></div>
                </div>
              })}
            </div>
          </div>

          <div className="card schedule-card">
            <span className="eyebrow">UPCOMING</span><h2>Payment calendar</h2>
            <div className="schedule-list">
              {upcomingOccurrences.slice(0, 8).map(({ bill, dueDate }) => {
                const paid = bill.paidDates.includes(dueDate)
                return <div className="schedule-row" key={`${bill.id}-${dueDate}`}>
                  <div className="schedule-date"><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(toDate(dueDate))}</span><strong>{toDate(dueDate).getDate()}</strong></div>
                  <div><strong>{bill.name}</strong><span>{scheduleLabel(bill)}</span></div>
                  <div className="schedule-money"><strong>{money(bill.amount)}</strong><button className={`mini-check ${paid ? 'done' : ''}`} onClick={() => toggleOccurrencePaid(bill.id, dueDate)}>{paid ? 'Paid' : 'Mark paid'}</button></div>
                </div>
              })}
              {upcomingOccurrences.length === 0 && <div className="empty-state">No upcoming bills scheduled.</div>}
            </div>
          </div>
        </div>
      </section>}

      {view === 'transactions' && <section className="card full-card">
        <div className="section-head"><div><span className="eyebrow">SPENDING</span><h2>Transactions & planned purchases</h2></div><button className="primary small" onClick={() => setModal('transaction')}><Icon name="plus"/> Add expense</button></div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Name</th><th>Category</th><th>Paycheck</th><th>Status</th><th>Amount</th><th></th></tr></thead><tbody>{data.transactions.map(t => <tr key={t.id}><td>{shortDate(t.date)}</td><td><strong>{t.name}</strong></td><td>{t.category}</td><td>{data.paychecks.find(p => p.id === t.paycheckId)?.label || '—'}</td><td><span className={`pill ${t.type}`}>{t.type === 'spent' ? 'Spent' : 'Planned'}</span></td><td><strong>{money(t.amount)}</strong></td><td><button className="delete" onClick={() => remove('transactions', t.id)}>Delete</button></td></tr>)}</tbody></table></div>
      </section>}

      {view === 'goals' && <section className="goals-grid">{data.goals.map(g => <div className="card goal-card" key={g.id}><div className="goal-icon"><Icon name="goals"/></div><h2>{g.name}</h2><div className="goal-money">{money(g.saved)} <span>of {money(g.target)}</span></div><Progress value={(g.saved / g.target) * 100}/><div className="goal-controls"><label>Saved<input type="number" step="0.01" value={g.saved} onChange={e => update('goals', g.id, { saved: Number(e.target.value) })}/></label><label>Target<input type="number" step="0.01" value={g.target} onChange={e => update('goals', g.id, { target: Number(e.target.value) })}/></label></div><p>Target: {longDate(g.targetDate)}</p><button className="delete" onClick={() => remove('goals', g.id)}>Delete goal</button></div>)}<button className="add-card" onClick={() => setModal('goal')}><Icon name="plus"/><strong>Add a goal</strong><span>Save toward anything important.</span></button></section>}

      {view === 'settings' && <section className="settings-grid">
        <div className="card"><span className="eyebrow">PAY ESTIMATES</span><h2>Income settings</h2><div className="form-grid one"><label>Hourly rate<input type="number" step="0.01" value={data.settings.hourlyRate} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, hourlyRate: Number(e.target.value) } }))}/></label><label>Overtime multiplier<input type="number" step="0.1" value={data.settings.overtimeMultiplier} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, overtimeMultiplier: Number(e.target.value) } }))}/></label><label>Starting take-home %<input type="number" step="0.1" value={data.settings.estimatedNetPercent} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, estimatedNetPercent: Number(e.target.value) } }))}/><small className="field-help">Used until you have an actual paycheck recorded.</small></label><label className="toggle-row"><span><strong>Learn from actual deposits</strong><small>Automatically use your real net-to-gross percentage for future paycheck forecasts.</small></span><input type="checkbox" checked={data.settings.autoLearnNet !== false} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, autoLearnNet: e.target.checked } }))}/></label><label>Safety buffer<input type="number" step="1" value={data.settings.safetyBuffer} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, safetyBuffer: Number(e.target.value) } }))}/></label></div></div>
        <div className="card"><span className="eyebrow">YOUR DATA</span><h2>Backup & privacy</h2><p className="muted">Your budget is currently stored on this device. Download a backup anytime so you have a copy of your information.</p><div className="stack-buttons"><button className="secondary" onClick={exportData}><Icon name="download"/> Download backup</button><button className="danger" onClick={resetData}><Icon name="reset"/> Reset budget</button></div></div>
      </section>}
    </main>

    <div className="mobile-nav">{navItems.slice(0, 5).map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon name={id}/><span>{label}</span></button>)}</div>

    {modal === 'bill' && <BillModal bill={editingBill} onClose={() => { setEditingBill(null); setModal(null) }} onSave={saveBill}/>} 
    {modal === 'transaction' && <TransactionModal paychecks={sortedPaychecks} defaultPaycheckId={selectedPaycheckId} onClose={() => setModal(null)} onSave={item => { setData(d => ({ ...d, transactions: [...d.transactions, item] })); setModal(null) }}/>} 
    {modal === 'paycheck' && <PaycheckModal onClose={() => setModal(null)} onSave={item => { setData(d => ({ ...d, paychecks: [...d.paychecks, item].sort((a, b) => a.date.localeCompare(b.date)) })); setSelectedPaycheckId(item.id); setModal(null) }}/>} 
    {modal === 'goal' && <GoalModal onClose={() => setModal(null)} onSave={item => { setData(d => ({ ...d, goals: [...d.goals, item] })); setModal(null) }}/>} 
  </div>
}

function BillModal({ bill, onClose, onSave }) {
  const existing = bill || {}
  const [f, setF] = useState({
    name: existing.name || '',
    amount: existing.amount ?? '',
    category: existing.category || 'Utilities',
    scheduleType: existing.scheduleType || 'monthly',
    dueDate: existing.dueDate || todayIso(),
    anchorDate: existing.anchorDate || existing.dueDate || todayIso(),
    dayOfMonth: existing.dayOfMonth || 15,
  })

  const submit = (e) => {
    e.preventDefault()
    const base = { id: bill?.id || uid('bill'), name: f.name, amount: Number(f.amount), category: f.category, scheduleType: f.scheduleType, paidDates: bill?.paidDates || [] }
    if (f.scheduleType === 'once') onSave({ ...base, dueDate: f.dueDate })
    else if (f.scheduleType === 'monthly') onSave({ ...base, anchorDate: f.anchorDate, dayOfMonth: Number(f.dayOfMonth) })
    else onSave({ ...base, anchorDate: f.anchorDate })
  }

  return <Modal title={bill ? 'Edit bill' : 'Add bill'} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="form-grid">
        <label>Bill name<input required autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })}/></label>
        <label>Amount<input required type="number" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })}/></label>
        <label>Category<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option>Housing</option><option>Utilities</option><option>Insurance</option><option>Debt</option><option>Subscription</option><option>Transportation</option><option>Other</option></select></label>
        <label>Repeats<select value={f.scheduleType} onChange={e => setF({ ...f, scheduleType: e.target.value })}><option value="once">One time</option><option value="weekly">Every week</option><option value="biweekly">Every other week</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></label>

        {f.scheduleType === 'once' && <label className="wide">Due date<input required type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })}/></label>}
        {f.scheduleType === 'monthly' && <><label>Day of month<input required type="number" min="1" max="31" value={f.dayOfMonth} onChange={e => setF({ ...f, dayOfMonth: e.target.value })}/></label><label>Start schedule on<input required type="date" value={f.anchorDate} onChange={e => setF({ ...f, anchorDate: e.target.value })}/></label></>}
        {(f.scheduleType === 'weekly' || f.scheduleType === 'biweekly' || f.scheduleType === 'yearly') && <label className="wide">First payment date<input required type="date" value={f.anchorDate} onChange={e => setF({ ...f, anchorDate: e.target.value })}/><small className="field-help">{f.scheduleType === 'biweekly' ? 'Choose one Friday, and it will repeat every other Friday.' : 'Future payments will repeat from this date.'}</small></label>}
      </div>
      <div className="schedule-preview"><Icon name="repeat"/><div><span>Schedule preview</span><strong>{scheduleLabel({ ...f, dayOfMonth: Number(f.dayOfMonth) })}</strong></div></div>
      <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">{bill ? 'Save changes' : 'Add bill'}</button></div>
    </form>
  </Modal>
}

function TransactionModal({ paychecks, defaultPaycheckId, onClose, onSave }) {
  const [f, setF] = useState({ name: '', amount: '', date: todayIso(), category: 'Everyday', paycheckId: defaultPaycheckId, type: 'planned' })
  return <Modal title="Add expense" onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave({ ...f, id: uid('txn'), amount: Number(f.amount) }) }}><div className="form-grid"><label>Name<input required autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })}/></label><label>Amount<input required type="number" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })}/></label><label>Date<input required type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })}/></label><label>Category<select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option>Everyday</option><option>Food</option><option>Gas</option><option>PC</option><option>Travel</option><option>Planned purchase</option><option>Other</option></select></label><label>Type<select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="planned">Planned</option><option value="spent">Spent</option></select></label><label>Pay from<select value={f.paycheckId} onChange={e => setF({ ...f, paycheckId: e.target.value })}>{paychecks.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Add expense</button></div></form></Modal>
}

function PaycheckModal({ onClose, onSave }) {
  const [f, setF] = useState({ date: addDays(todayIso(), 14), label: 'Paycheck', expectedNet: 0, actualNet: null, regularHours: 80, overtimeHours: 0, status: 'upcoming' })
  return <Modal title="Add paycheck" onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave({ ...f, id: uid('pc'), expectedNet: Number(f.expectedNet), regularHours: Number(f.regularHours), overtimeHours: Number(f.overtimeHours) }) }}><div className="form-grid"><label>Date<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })}/></label><label>Label<input value={f.label} onChange={e => setF({ ...f, label: e.target.value })}/></label><label>Regular hours<input type="number" step="0.1" value={f.regularHours} onChange={e => setF({ ...f, regularHours: e.target.value })}/></label><label>Overtime hours<input type="number" step="0.1" value={f.overtimeHours} onChange={e => setF({ ...f, overtimeHours: e.target.value })}/></label></div><div className="schedule-preview"><Icon name="wallet"/><div><span>Automatic forecast</span><strong>Take-home will be projected from your hours and learned paycheck rate.</strong></div></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Add paycheck</button></div></form></Modal>
}

function GoalModal({ onClose, onSave }) {
  const [f, setF] = useState({ name: '', target: '', saved: 0, targetDate: addDays(todayIso(), 60) })
  return <Modal title="Add goal" onClose={onClose}><form onSubmit={e => { e.preventDefault(); onSave({ ...f, id: uid('goal'), target: Number(f.target), saved: Number(f.saved) }) }}><div className="form-grid"><label>Goal name<input autoFocus required value={f.name} onChange={e => setF({ ...f, name: e.target.value })}/></label><label>Target amount<input required type="number" step="0.01" value={f.target} onChange={e => setF({ ...f, target: e.target.value })}/></label><label>Already saved<input type="number" step="0.01" value={f.saved} onChange={e => setF({ ...f, saved: e.target.value })}/></label><label>Target date<input type="date" value={f.targetDate} onChange={e => setF({ ...f, targetDate: e.target.value })}/></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary">Add goal</button></div></form></Modal>
}

export default App
