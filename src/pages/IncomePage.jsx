import EmptyState from '../components/EmptyState'
import Icon from '../components/Icon'
import Tabs from '../components/Tabs'
import { money, shortDate } from '../lib/format'
import { todayIso } from '../lib/dates'
import { recurrenceLabel } from '../lib/recurrence'

function sourceName(item) {
  return item.employer || item.name || 'Income'
}

function IncomeOccurrenceRow({ occurrence, onRecord }) {
  return (
    <div className="finance-row">
      <div className="row-date">
        <strong>{shortDate(occurrence.date)}</strong>
      </div>

      <div className="row-main">
        <strong>{sourceName(occurrence.item)}</strong>
        <span>
          {occurrence.actual?.actualNet != null
            ? 'Recorded deposit'
            : occurrence.item.kind === 'paycheck'
              ? 'Estimated paycheck'
              : 'Expected income'}
        </span>
      </div>

      <div className="row-amount">{money(occurrence.amount)}</div>

      <div className="row-action">
        <button
          type="button"
          className="small-button"
          onClick={() => onRecord(occurrence)}
        >
          {occurrence.actual?.actualNet != null
            ? 'Edit deposit'
            : 'Record deposit'}
        </button>
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
  onManagePaychecks,
}) {
  const now = todayIso()

  const future = occurrences
    .filter((occurrence) => occurrence.date >= now && !occurrence.actual)
    .slice(0, 8)

  const history = occurrences
    .filter((occurrence) => occurrence.date < now || occurrence.actual)
    .slice(-20)
    .reverse()

  const recurring = income.filter(
    (item) => (item.recurrence || 'once') !== 'once',
  )
  const oneTime = income.filter(
    (item) =>
      item.kind !== 'paycheck' &&
      (item.recurrence || 'once') === 'once',
  )

  const shownItems = tab === 'recurring' ? recurring : oneTime

  const nextOccurrenceFor = (item) =>
    occurrences.find(
      (occurrence) =>
        occurrence.item.id === item.id &&
        occurrence.date >= now &&
        !occurrence.actual,
    )

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Income</h1>
          <p>Upcoming deposits and income history.</p>
        </div>
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
                  ? `${sourceName(future[0].item)} · ${shortDate(future[0].date)}`
                  : 'Not scheduled'}
              </small>
            </div>

            <div>
              <span>Take-home estimate</span>
              <strong>{effectiveNetPercent.toFixed(1)}%</strong>
              <small>
                {learnedNetPercent != null
                  ? 'Based on recorded paychecks'
                  : 'Current estimate'}
              </small>
            </div>

            <div>
              <span>Recurring sources</span>
              <strong>{recurring.length}</strong>
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
              {shownItems.map((item) => {
                const nextOccurrence = nextOccurrenceFor(item)
                const isPaycheck = item.kind === 'paycheck'

                return (
                  <div className="finance-row" key={item.id}>
                    <div className="row-icon">
                      <Icon name="income" />
                    </div>

                    <div className="row-main">
                      <strong>{sourceName(item)}</strong>
                      <span>
                        {recurrenceLabel(item.recurrence, item.firstDate)} ·{' '}
                        {isPaycheck ? 'Paycheck' : 'Income'}
                      </span>
                    </div>

                    <div className="row-amount">
                      {nextOccurrence
                        ? money(nextOccurrence.amount)
                        : money(item.amount || item.expectedNet || 0)}
                    </div>

                    <div className="row-action action-pair">
                      {isPaycheck ? (
                        <button
                          type="button"
                          className="text-button"
                          onClick={onManagePaychecks}
                        >
                          Manage
                        </button>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title={
                tab === 'recurring'
                  ? 'No recurring income.'
                  : 'No one-time income.'
              }
              action={tab === 'one-time' ? 'Add income' : undefined}
              onAction={tab === 'one-time' ? onAdd : undefined}
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
