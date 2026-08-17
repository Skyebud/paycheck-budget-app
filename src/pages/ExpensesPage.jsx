import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import Tabs from '../components/Tabs'
import { money, shortDate } from '../lib/format'
import { todayIso } from '../lib/dates'
import { recurrenceLabel } from '../lib/recurrence'

function BillOccurrenceRow({ occurrence, onTogglePaid }) {
  return (
    <div className={`finance-row ${occurrence.paid ? 'muted-row' : ''}`}>
      <div className="row-date">
        <strong>{shortDate(occurrence.date)}</strong>
      </div>

      <div className="row-main">
        <strong>{occurrence.bill.name}</strong>
        <span>{occurrence.bill.category || 'Bill'}</span>
      </div>

      <div className="row-amount">{money(occurrence.bill.amount)}</div>

      <div className="row-action">
        <button
          type="button"
          className="small-button"
          onClick={() => onTogglePaid(occurrence)}
        >
          {occurrence.paid ? 'Paid' : 'Mark paid'}
        </button>
      </div>
    </div>
  )
}

function TransactionRow({ item, onDelete }) {
  return (
    <div className="finance-row">
      <div className="row-date">
        <strong>{shortDate(item.date)}</strong>
      </div>

      <div className="row-main">
        <strong>{item.name || item.category}</strong>
        <span>
          {item.type === 'planned'
            ? 'Planned'
            : item.category || 'Money out'}
        </span>
      </div>

      <div className="row-amount">{money(item.amount)}</div>

      <div className="row-action">
        <button
          type="button"
          className="text-button danger"
          onClick={() => onDelete(item.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function ExpensesPage({
  tab,
  setTab,
  bills,
  billOccurrences,
  transactions,
  onAddBill,
  onEditBill,
  onDeleteBill,
  onTogglePaid,
  onAddSpending,
  onAddPlanned,
  onDeleteTransaction,
}) {
  const spending = transactions
    .filter(
      (transaction) =>
        transaction.type === 'spent' && !transaction.sourceBillId,
    )
    .sort((a, b) => b.date.localeCompare(a.date))

  const planned = transactions
    .filter((transaction) => transaction.type === 'planned')
    .sort((a, b) => a.date.localeCompare(b.date))

  const upcomingBills = billOccurrences
    .filter((occurrence) => occurrence.date >= todayIso())
    .slice(0, 12)

  const monthlyBillEstimate = bills.reduce((sum, bill) => {
    const amount = Number(bill.amount || 0)

    if (bill.scheduleType === 'weekly') return sum + (amount * 52) / 12
    if (bill.scheduleType === 'biweekly') return sum + (amount * 26) / 12
    if (bill.scheduleType === 'monthly') return sum + amount

    return sum
  }, 0)

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Money Out</h1></div>

        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onAddBill}
          >
            + Bill
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onAddSpending}
          >
            + Money out
          </button>
        </div>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['overview', 'Overview'],
          ['bills', 'Bills'],
          ['spending', 'Purchases'],
          ['planned', 'Planned'],
        ]}
      />

      {tab === 'overview' && (
        <>
          <section className="summary-line">
            <div>
              <span>Regular bills</span>
              <strong>{money(monthlyBillEstimate)}</strong>
              <small>About this much each month</small>
            </div>

            <div>
              <span>Recent purchases</span>
              <strong>
                {money(
                  spending
                    .slice(0, 10)
                    .reduce(
                      (sum, item) => sum + Number(item.amount || 0),
                      0,
                    ),
                )}
              </strong>
              <small>Last 10 entries</small>
            </div>

            <div>
              <span>Planned</span>
              <strong>
                {money(
                  planned.reduce(
                    (sum, item) => sum + Number(item.amount || 0),
                    0,
                  ),
                )}
              </strong>
            </div>
          </section>

          <section className="section-block">
            <div className="section-head">
              <h2>Upcoming bills</h2>
            </div>

            {upcomingBills.length ? (
              <div className="finance-list">
                {upcomingBills.map((occurrence) => (
                  <BillOccurrenceRow
                    key={occurrence.key}
                    occurrence={occurrence}
                    onTogglePaid={onTogglePaid}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No upcoming bills."
                action="Add bill"
                onAction={onAddBill}
              />
            )}
          </section>
        </>
      )}

      {tab === 'bills' && (
        <section className="section-block flush-top">
          {bills.length ? (
            <div className="finance-list">
              {bills.map((bill) => (
                <div className="finance-row" key={bill.id}>
                  <div className="row-icon">
                    <Icon name="expenses" />
                  </div>

                  <div className="row-main">
                    <strong>{bill.name}</strong>
                    <span>
                      {recurrenceLabel(
                        bill.scheduleType,
                        bill.anchorDate || bill.dueDate,
                      )}{' '}
                      · {bill.category || 'Other'}
                    </span>
                  </div>

                  <div className="row-amount">{money(bill.amount)}</div>

                  <div className="row-action action-pair">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onEditBill(bill)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => onDeleteBill(bill.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No bills added."
              action="Add bill"
              onAction={onAddBill}
            />
          )}
        </section>
      )}

      {tab === 'spending' && (
        <section className="section-block flush-top">
          <div className="section-head">
            <h2>Purchases</h2>
            <button
              type="button"
              className="small-button"
              onClick={onAddSpending}
            >
              Add money out
            </button>
          </div>

          {spending.length ? (
            <div className="finance-list">
              {spending.map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  onDelete={onDeleteTransaction}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No purchases yet."
              action="Add money out"
              onAction={onAddSpending}
            />
          )}
        </section>
      )}

      {tab === 'planned' && (
        <section className="section-block flush-top">
          <div className="section-head">
            <h2>Planned purchases</h2>
            <button
              type="button"
              className="small-button"
              onClick={onAddPlanned}
            >
              Plan a purchase
            </button>
          </div>

          {planned.length ? (
            <div className="finance-list">
              {planned.map((item) => (
                <TransactionRow
                  key={item.id}
                  item={item}
                  onDelete={onDeleteTransaction}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nothing planned yet."
              action="Plan a purchase"
              onAction={onAddPlanned}
            />
          )}
        </section>
      )}
    </div>
  )
}
