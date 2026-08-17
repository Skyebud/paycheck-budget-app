import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { money, shortDate } from '../lib/format'

function SignedAmount({ value }) {
  return (
    <span className={value >= 0 ? 'money-positive' : 'money-negative'}>
      {value >= 0 ? '+' : '-'}{money(Math.abs(value))}
    </span>
  )
}

export default function Dashboard({
  currentBalance,
  projectedBalance,
  nextIncome,
  billsTotal,
  recentActivity,
  upcomingRows,
  onSetBalance,
  onAddTransaction,
  onAddBill,
  onAddIncome,
  onTogglePaid,
}) {
  const [editingBalance, setEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState(
    String(Number(currentBalance || 0).toFixed(2)),
  )

  useEffect(() => {
    if (!editingBalance) {
      setBalanceInput(String(Number(currentBalance || 0).toFixed(2)))
    }
  }, [currentBalance, editingBalance])

  const saveBalance = (event) => {
    event.preventDefault()
    onSetBalance(Number(balanceInput || 0))
    setEditingBalance(false)
  }

  const nextIncomeName = nextIncome
    ? nextIncome.item.employer || nextIncome.item.name
    : ''

  return (
    <div className="page">
      <header className="page-head compact">
        <div><h1>Dashboard</h1></div>

        <div className="page-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onAddTransaction}
          >
            + Transaction
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onAddBill}
          >
            + Bill
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onAddIncome}
          >
            + Income
          </button>
        </div>
      </header>

      <section className="account-summary">
        <div className="account-balance">
          <span>Current balance</span>

          {editingBalance ? (
            <form className="balance-editor" onSubmit={saveBalance}>
              <span>$</span>
              <input
                type="number"
                step="0.01"
                value={balanceInput}
                onChange={(event) => setBalanceInput(event.target.value)}
                autoFocus
              />
              <button type="submit" className="small-button">Save</button>
              <button
                type="button"
                className="text-button"
                onClick={() => setEditingBalance(false)}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <strong>{money(currentBalance)}</strong>
              <button
                type="button"
                className="text-button balance-link"
                onClick={() => setEditingBalance(true)}
              >
                Update balance
              </button>
            </>
          )}
        </div>

        <div className="account-stat">
          <span>Projected balance</span>
          <strong>{money(projectedBalance)}</strong>
          <small>Next 30 days</small>
        </div>

        <div className="account-stat">
          <span>Next income</span>
          <strong>{money(nextIncome?.amount || 0)}</strong>
          <small>
            {nextIncome
              ? `${nextIncomeName} · ${shortDate(nextIncome.date)}`
              : 'Not scheduled'}
          </small>
        </div>

        <div className="account-stat">
          <span>Bills due before payday</span>
          <strong>{money(billsTotal)}</strong>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Recent transactions</h2>
        </div>

        {recentActivity.length ? (
          <div className="finance-list ledger-list">
            {recentActivity.map((row) => (
              <div className="finance-row ledger-row" key={row.key}>
                <div className="row-date">
                  <strong>{shortDate(row.date)}</strong>
                </div>

                <div className="row-main">
                  <strong>{row.name}</strong>
                  <span>{row.category}</span>
                </div>

                <div className="row-amount">
                  <SignedAmount value={row.signedAmount} />
                </div>

                <div className="ledger-balance">
                  <span>Balance</span>
                  <strong>{money(row.runningBalance)}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No transactions yet." />
        )}
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Upcoming</h2>
          <span>{Math.min(upcomingRows.length, 8)} shown</span>
        </div>

        {upcomingRows.length ? (
          <div className="finance-list ledger-list">
            {upcomingRows.slice(0, 8).map((row) => (
              <div className="finance-row ledger-row" key={row.key}>
                <div className="row-date">
                  <strong>{shortDate(row.date)}</strong>
                </div>

                <div className="row-main">
                  <strong>{row.name}</strong>
                  <span>{row.category}</span>
                </div>

                <div className="row-amount">
                  <SignedAmount value={row.signedAmount} />
                </div>

                <div className="ledger-balance ledger-balance-action">
                  <div>
                    <span>Projected</span>
                    <strong>{money(row.runningBalance)}</strong>
                  </div>

                  {row.type === 'bill' && (
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => onTogglePaid(row.occurrence)}
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing scheduled." />
        )}
      </section>
    </div>
  )
}
