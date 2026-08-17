import EmptyState from '../components/EmptyState'
import { money, shortDate } from '../lib/format'

export default function Dashboard({
  nextIncome,
  cycleEnd,
  safeToSpend,
  billsTotal,
  plannedTotal,
  spentTotal,
  rows,
  markBillPaid,
  onAddIncome,
  onAddBill,
  onAddSpending,
}) {
  return (
    <div className="page">
      <header className="page-head compact">
        <div>
          <h1>Dashboard</h1>
          {nextIncome && (
            <p>
              {shortDate(nextIncome.date)} – {shortDate(cycleEnd)}
            </p>
          )}
        </div>

        <div className="quick-actions">
          <button type="button" onClick={onAddIncome}>+ Income</button>
          <button type="button" onClick={onAddBill}>+ Bill</button>
          <button type="button" onClick={onAddSpending}>+ Spending</button>
        </div>
      </header>

      <section className="balance-strip">
        <div className="balance-primary">
          <span>Safe to spend</span>
          <strong className={safeToSpend < 0 ? 'negative' : ''}>
            {money(safeToSpend)}
          </strong>
        </div>

        <div className="balance-stat">
          <span>Next income</span>
          <strong>{money(nextIncome?.amount || 0)}</strong>
          <small>
            {nextIncome ? shortDate(nextIncome.date) : 'Not scheduled'}
          </small>
        </div>

        <div className="balance-stat">
          <span>Bills</span>
          <strong>{money(billsTotal)}</strong>
        </div>

        <div className="balance-stat">
          <span>Planned</span>
          <strong>{money(plannedTotal)}</strong>
        </div>

        <div className="balance-stat">
          <span>Spent</span>
          <strong>{money(spentTotal)}</strong>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Upcoming</h2>
          <span>{rows.length} items</span>
        </div>

        {rows.length ? (
          <div className="finance-list">
            {rows.map((row) => (
              <div
                className={`finance-row ${row.paid ? 'muted-row' : ''}`}
                key={row.key}
              >
                <div className="row-date">
                  <strong>{shortDate(row.date)}</strong>
                </div>

                <div className="row-main">
                  <strong>{row.name}</strong>
                  <span>{row.category}</span>
                </div>

                <div className="row-amount">{money(row.amount)}</div>

                <div className="row-action">
                  {row.type === 'bill' && (
                    <button
                      type="button"
                      className="small-button"
                      onClick={() => markBillPaid(row.occurrence)}
                    >
                      {row.paid ? 'Paid' : 'Mark paid'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing scheduled for this pay period." />
        )}
      </section>
    </div>
  )
}
