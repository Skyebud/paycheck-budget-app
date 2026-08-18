import { useEffect, useState } from 'react'
import DateInput from '../components/DateInput'
import Field from '../components/Field'
import Segmented from '../components/Segmented'
import { todayIso } from '../lib/dates'
import { uid } from '../lib/format'

export default function SetupScreen({ data, setData }) {
  const [kind, setKind] = useState('paycheck')
  const [employer, setEmployer] = useState('')
  const [recurrence, setRecurrence] = useState('biweekly')
  const [firstDate, setFirstDate] = useState(todayIso())
  const [payMode, setPayMode] = useState('hourly')
  const [hourlyRate, setHourlyRate] = useState(
    data.settings.hourlyRate || 29.28,
  )
  const [regularHours, setRegularHours] = useState(80)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (kind === 'paycheck' && recurrence === 'once') {
      setRecurrence('biweekly')
    }
  }, [kind, recurrence])

  const finish = (skip = false) => {
    const cleanEmployer = employer.trim()
    const savedRecurrence =
      kind === 'paycheck' && recurrence === 'once'
        ? 'biweekly'
        : recurrence

    const income = skip
      ? []
      : [
          {
            id: uid('income'),
            name:
              kind === 'paycheck'
                ? cleanEmployer || 'Paycheck'
                : 'Income',
            employer:
              kind === 'paycheck'
                ? cleanEmployer
                : undefined,
            kind,
            recurrence: savedRecurrence,
            firstDate,
            payMode,
            hourlyRate: Number(hourlyRate || 0),
            regularHours: Number(regularHours || 0),
            overtimeHours: 0,
            overtimeMultiplier: 1.5,
            amount: Number(amount || 0),
            expectedNet:
              payMode === 'fixed' ? Number(amount || 0) : 0,
            actuals: {},
          },
        ]

    setData((current) => ({
      ...current,
      setupComplete: true,
      income: [...current.income, ...income],
    }))
  }

  return (
    <main className="setup-page">
      <section className="setup-panel">
        <div className="brand-lockup">
          <div className="brand-mark large">P</div>
          <strong>Paycheck Budget</strong>
        </div>

        <div className="setup-heading">
          <h1>Add your primary income</h1>
          <p>You can add bills and other income after setup.</p>
        </div>

        <div className="form-stack">
          <Field label="Income type">
            <Segmented
              value={kind}
              onChange={setKind}
              options={[
                ['paycheck', 'Paycheck'],
                ['other', 'Other'],
              ]}
            />
          </Field>

          {kind === 'paycheck' && (
            <Field label="Employer or company (optional)">
              <input
                value={employer}
                onChange={(event) => setEmployer(event.target.value)}
                placeholder="DeVry University"
              />
            </Field>
          )}

          <Field label="Schedule">
            <Segmented
              value={recurrence}
              onChange={setRecurrence}
              options={
                kind === 'paycheck'
                  ? [
                      ['weekly', 'Weekly'],
                      ['biweekly', 'Every 2 weeks'],
                      ['monthly', 'Monthly'],
                    ]
                  : [
                      ['once', 'One-time'],
                      ['weekly', 'Weekly'],
                      ['biweekly', 'Every 2 weeks'],
                      ['monthly', 'Monthly'],
                    ]
              }
            />
          </Field>

          <Field
            label={
              recurrence === 'once'
                ? 'Date'
                : kind === 'paycheck'
                  ? 'First payday'
                  : 'First payment'
            }
          >
            <DateInput
              value={firstDate}
              onChange={(event) => setFirstDate(event.target.value)}
            />
          </Field>

          {kind === 'paycheck' && (
            <Field label="Pay type">
              <Segmented
                value={payMode}
                onChange={setPayMode}
                options={[
                  ['hourly', 'Hourly'],
                  ['fixed', 'Fixed net'],
                ]}
              />
            </Field>
          )}

          {kind === 'paycheck' && payMode === 'hourly' ? (
            <div className="form-grid two">
              <Field label="Hourly rate">
                <input
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                />
              </Field>

              <Field label="Typical hours">
                <input
                  type="number"
                  step="0.1"
                  value={regularHours}
                  onChange={(event) => setRegularHours(event.target.value)}
                />
              </Field>
            </div>
          ) : (
            <Field label="Amount">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
          )}
        </div>

        <div className="setup-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => finish(true)}
          >
            Skip
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() => finish(false)}
          >
            Continue
          </button>
        </div>
      </section>
    </main>
  )
}
