import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import { addDays, todayIso } from '../lib/dates'
import { money, shortDate } from '../lib/format'
import { recurrenceLabel } from '../lib/recurrence'

export default function BillsPage({
  bills,
  occurrences,
  onAddBill,
  onEditBill,
  onDeleteBill,
  onTogglePaid,
  onChangeDate,
}) {
  const today = todayIso()
  const nextThirty = addDays(today, 30)

  const upcoming = occurrences
    .filter((occurrence) => occurrence.date >= today)
    .slice(0, 12)

  const dueSoonTotal = occurrences
    .filter(
      (occurrence) =>
        occurrence.date >= today &&
        occurrence.date <= nextThirty &&
        !occurrence.paid,
    )
    .reduce(
      (sum, occurrence) =>
        sum + Number(occurrence.bill.amount || 0),
      0,
    )

  const monthlyEstimate = bills.reduce((sum, bill) => {
    const amount = Number(bill.amount || 0)
    if (bill.scheduleType === 'weekly') return sum + (amount * 52) / 12
    if (bill.scheduleType === 'biweekly') return sum + (amount * 26) / 12
    if (bill.scheduleType === 'monthly') return sum + amount
    return sum
  }, 0)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Bills</h1>
          <p>Due dates, recurring bills, and one-time bills.</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onAddBill}
        >
          <Icon name="plus" />
          Add bill
        </button>
      </header>

      <section className="summary-line">
        <div>
          <span>Next 30 days</span>
          <strong>{money(dueSoonTotal)}</strong>
          <small>Unpaid bills</small>
        </div>
        <div>
          <span>Recurring estimate</span>
          <strong>{money(monthlyEstimate)}</strong>
          <small>Approx. per month</small>
        </div>
        <div>
          <span>Bills</span>
          <strong>{bills.length}</strong>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>Upcoming bills</h2>
        </div>

        {upcoming.length ? (
          <div className="finance-list">
            {upcoming.map((occurrence) => (
              <div className={`finance-row bill-occurrence-row ${occurrence.paid ? 'muted-row' : ''}`} key={occurrence.key}>
                <div className="row-date">
                  <strong>{shortDate(occurrence.date)}</strong>
                </div>
                <div className="row-main">
                  <strong>{occurrence.bill.name}</strong>
                  <span>{occurrence.bill.category || 'Bill'}</span>
                </div>
                <div className="row-amount">{money(occurrence.bill.amount)}</div>
                <div className="row-action bill-actions">
                  {!occurrence.paid && (
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onChangeDate(occurrence)}
                    >
                      Change date
                    </button>
                  )}
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => onTogglePaid(occurrence)}
                  >
                    {occurrence.paid ? 'Paid' : 'Mark paid'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming bills." />
        )}
      </section>

      <section className="section-block">
        <div className="section-head">
          <h2>All bills</h2>
        </div>

        {bills.length ? (
          <div className="finance-list">
            {bills.map((bill) => (
              <div className="finance-row bill-schedule-row" key={bill.id}>
                <div className="row-icon">
                  <Icon name="calendar" />
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
    </div>
  )
}
