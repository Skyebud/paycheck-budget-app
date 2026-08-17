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

function PaycheckRow({
  item,
  occurrences,
  onEdit,
  onDelete,
}) {
  const today = todayIso()
  const next = occurrences.find(
    (occurrence) =>
      occurrence.item.id === item.id &&
      occurrence.date >= today &&
      !occurrence.actual,
  )

  return (
    <div className="finance-row paycheck-income-row">
      <div className="row-icon">
        <Icon name="income" />
      </div>

      <div className="row-main">
        <strong>{sourceName(item)}</strong>
        <span>
          {recurrenceLabel(item.recurrence, item.firstDate)}
          {next ? ` · Next ${shortDate(next.date)}` : ''}
        </span>
      </div>

      <div className="row-amount">
        {next
          ? money(next.amount)
          : money(item.expectedNet || item.amount || 0)}
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
  )
}

export default function IncomePage({
  tab,
  setTab,
  income,
  paycheckSources = [],
  occurrences,
  effectiveNetPercent,
  learnedNetPercent,
  onAdd,
  onEdit,
  onDelete,
  onRecord,
  onAddPaycheck,
  onEditPaycheck,
  onDeletePaycheck,
}) {
  const now = todayIso()

  const future = occurrences
    .filter((occurrence) => occurrence.date >= now && !occurrence.actual)
    .slice(0, 8)

  const history = occurrences
    .filter((occurrence) => occurrence.date < now || occurrence.actual)
    .slice(-20)
    .reverse()

  const oneTime = income.filter(
    (item) =>
      item.kind !== 'paycheck' &&
      (item.recurrence || 'once') === 'once',
  )

  const headerAction =
    tab === 'paychecks' ? (
      <button
        type="button"
        className="primary-button"
        onClick={onAddPaycheck}
      >
        <Icon name="plus" />
        Add paycheck
      </button>
    ) : tab === 'one-time' ? (
      <button
        type="button"
        className="primary-button"
        onClick={onAdd}
      >
        <Icon name="plus" />
        Add income
      </button>
    ) : null

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Income</h1>
        </div>
        {headerAction}
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['overview', 'Overview'],
          ['paychecks', 'Paychecks'],
          ['one-time', 'One-Time'],
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
              <span>Paycheck sources</span>
              <strong>{paycheckSources.length}</strong>
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
              <EmptyState title="No income scheduled." />
            )}
          </section>
        </>
      )}

      {tab === 'paychecks' && (
        <section className="section-block flush-top">
          <div className="section-head income-section-head">
            <h2>Paycheck sources</h2>
            <button
              type="button"
              className="small-button"
              onClick={onAddPaycheck}
            >
              + Add paycheck
            </button>
          </div>

          {paycheckSources.length ? (
            <div className="finance-list">
              {paycheckSources.map((item) => (
                <PaycheckRow
                  key={item.id}
                  item={item}
                  occurrences={occurrences}
                  onEdit={onEditPaycheck}
                  onDelete={onDeletePaycheck}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No paycheck sources added."
              action="Add paycheck"
              onAction={onAddPaycheck}
            />
          )}
        </section>
      )}

      {tab === 'one-time' && (
        <section className="section-block flush-top">
          {oneTime.length ? (
            <div className="finance-list">
              {oneTime.map((item) => {
                const occurrence = occurrences.find(
                  (entry) => entry.item.id === item.id,
                )

                return (
                  <div className="finance-row" key={item.id}>
                    <div className="row-date">
                      <strong>{shortDate(item.firstDate)}</strong>
                    </div>

                    <div className="row-main">
                      <strong>{sourceName(item)}</strong>
                      <span>One-time income</span>
                    </div>

                    <div className="row-amount">
                      {money(occurrence?.amount ?? item.amount ?? 0)}
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
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No one-time income."
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
