import EmptyState from '../components/EmptyState'
import Tabs from '../components/Tabs'
import { money, shortDate } from '../lib/format'

function SignedAmount({ value }) {
  return (
    <span className={value >= 0 ? 'money-positive' : 'money-negative'}>
      {value >= 0 ? '+' : '-'}{money(Math.abs(value))}
    </span>
  )
}

export default function TransactionsPage({
  tab,
  setTab,
  currentBalance,
  ledger,
  planned,
  onAddTransaction,
  onAddPlanned,
  onEditTransaction,
  onDeleteTransaction,
}) {
  const recordedIncome = ledger
    .filter((row) => row.type === 'deposit')
    .reduce((sum, row) => sum + Number(row.transaction.amount || 0), 0)

  const recordedExpenses = ledger
    .filter((row) => row.type === 'spent')
    .reduce((sum, row) => sum + Number(row.transaction.amount || 0), 0)

  const shown = ledger.filter((row) => {
    if (tab === 'income') return row.type === 'deposit'
    if (tab === 'expenses') return row.type === 'spent'
    return true
  })

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Transactions</h1>
          <p>Your checkbook and account activity.</p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onAddPlanned}
          >
            Plan purchase
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onAddTransaction}
          >
            + Transaction
          </button>
        </div>
      </header>

      <section className="summary-line transaction-summary">
        <div>
          <span>Current balance</span>
          <strong>{money(currentBalance)}</strong>
        </div>
        <div>
          <span>Recorded income</span>
          <strong>{money(recordedIncome)}</strong>
        </div>
        <div>
          <span>Recorded expenses</span>
          <strong>{money(recordedExpenses)}</strong>
        </div>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['all', 'All'],
          ['income', 'Income'],
          ['expenses', 'Expenses'],
          ['planned', 'Planned'],
        ]}
      />

      {tab !== 'planned' && (
        <section className="section-block flush-top">
          {shown.length ? (
            <>
              <div className="ledger-head" aria-hidden="true">
                <span>Date</span>
                <span>Description</span>
                <span>Amount</span>
                <span>Balance</span>
                <span />
              </div>
              <div className="finance-list ledger-list">
                {shown.map((row) => (
                  <div className="finance-row transaction-row" key={row.key}>
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

                    <div className="transaction-balance">
                      <strong>{money(row.runningBalance)}</strong>
                    </div>

                    <div className="row-action action-pair">
                      {row.transaction.sourceBillId || row.transaction.sourceIncomeId ? (
                        <span className="linked-label">
                          {row.transaction.sourceBillId ? 'Bill' : 'Income'}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => onEditTransaction(row.transaction)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-button danger"
                            onClick={() => onDeleteTransaction(row.transaction.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="No transactions here yet."
              action="Add transaction"
              onAction={onAddTransaction}
            />
          )}
        </section>
      )}

      {tab === 'planned' && (
        <section className="section-block flush-top">
          {planned.length ? (
            <div className="finance-list">
              {planned.map((item) => (
                <div className="finance-row simple-transaction-row" key={item.id}>
                  <div className="row-date">
                    <strong>{shortDate(item.date)}</strong>
                  </div>
                  <div className="row-main">
                    <strong>{item.name || item.category}</strong>
                    <span>{item.category || 'Planned purchase'}</span>
                  </div>
                  <div className="row-amount">{money(item.amount)}</div>
                  <div className="row-action action-pair">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onEditTransaction(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => onDeleteTransaction(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No planned purchases."
              action="Plan purchase"
              onAction={onAddPlanned}
            />
          )}
        </section>
      )}
    </div>
  )
}
