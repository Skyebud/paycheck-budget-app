import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import Tabs from '../components/Tabs'
import { money, shortDate } from '../lib/format'
import { todayIso } from '../lib/dates'
import { recurrenceLabel } from '../lib/recurrence'

function IncomeOccurrenceRow({ occurrence, onRecord }) {
  return (
    <div className="finance-row">
      <div className="row-date">
        <strong>{shortDate(occurrence.date)}</strong>
      </div>

      <div className="row-main">
        <strong>{occurrence.item.name}</strong>
        <span>
          {occurrence.actual?.actualNet != null
            ? 'Actual deposit'
            : 'Estimated'}
        </span>
      </div>

      <div className="row-amount">{money(occurrence.amount)}</div>

      <div className="row-action">
        {occurrence.item.kind === 'paycheck' && (
          <button
            type="button"
            className="small-button"
            onClick={() => onRecord(occurrence)}
          >
            {occurrence.actual?.actualNet != null
              ? 'Edit actual'
              : 'Record actual'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function IncomePage({
  tab,
  setTab,
  income,
  occurrences,
  effectiveNetPercent,
  learnedNetPercent,
  onAdd,
  onEdit,
  onDelete,
  onRecord,
}) {
  const now = todayIso()

  const future = occurrences
    .filter((occurrence) => occurrence.date >= now)
    .slice(0, 8)

  const history = occurrences
    .filter((occurrence) => occurrence.date < now || occurrence.actual)
    .slice(-20)
    .reverse()

  const shownItems =
    tab === 'recurring'
      ? income.filter((item) => item.recurrence !== 'once')
      : income.filter((item) => item.recurrence === 'once')

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Income</h1></div>
        <button type="button" className="primary-button" onClick={onAdd}>
          <Icon name="plus" />
          Add income
        </button>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['overview', 'Overview'],
          ['recurring', 'Recurring'],
          ['one-time', 'One-time'],
          ['history', 'History'],
        ]}
      />

      {tab === 'overview' && (
        <>
          <section className="summary-line">
            <div>
              <span>Next deposit</span>
              <strong>{money(future[0]?.amount || 0)}</strong>
              <small>
                {future[0]
                  ? `${future[0].item.name} · ${shortDate(future[0].date)}`
                  : 'Not scheduled'}
              </small>
            </div>

            <div>
              <span>Net rate</span>
              <strong>{effectiveNetPercent.toFixed(1)}%</strong>
              <small>
                {learnedNetPercent != null
                  ? 'Based on actual pay'
                  : 'Current estimate'}
              </small>
            </div>

            <div>
              <span>Sources</span>
              <strong>{income.length}</strong>
            </div>
          </section>

          <section className="section-block">
            <div className="section-head">
              <h2>Upcoming income</h2>
            </div>

            {future.length ? (
              <div className="finance-list">
                {future.map((occurrence) => (
                  <IncomeOccurrenceRow
                    key={occurrence.key}
                    occurrence={occurrence}
                    onRecord={onRecord}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No income scheduled."
                action="Add income"
                onAction={onAdd}
              />
            )}
          </section>
        </>
      )}

      {(tab === 'recurring' || tab === 'one-time') && (
        <section className="section-block flush-top">
          {shownItems.length ? (
            <div className="finance-list">
              {shownItems.map((item) => (
                <div className="finance-row" key={item.id}>
                  <div className="row-icon">
                    <Icon name="income" />
                  </div>

                  <div className="row-main">
                    <strong>{item.name}</strong>
                    <span>
                      {recurrenceLabel(item.recurrence, item.firstDate)} ·{' '}
                      {item.kind === 'paycheck'
                        ? 'Paycheck'
                        : 'Other income'}
                    </span>
                  </div>

                  <div className="row-amount">
                    {item.kind === 'paycheck' && item.payMode === 'hourly'
                      ? `${money(item.hourlyRate)}/hr`
                      : money(item.amount || item.expectedNet)}
                  </div>

                  <div className="row-action action-pair">
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => onEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => onDelete(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={`No ${
                tab === 'recurring' ? 'recurring' : 'one-time'
              } income.`}
              action="Add income"
              onAction={onAdd}
            />
          )}
        </section>
      )}

      {tab === 'history' && (
        <section className="section-block flush-top">
          {history.length ? (
            <div className="finance-list">
              {history.map((occurrence) => (
                <IncomeOccurrenceRow
                  key={occurrence.key}
                  occurrence={occurrence}
                  onRecord={onRecord}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No income history yet." />
          )}
        </section>
      )}
    </div>
  )
}
