import { useEffect, useState } from 'react'
import DateInput from '../components/DateInput'
import Field from '../components/Field'
import Segmented from '../components/Segmented'
import { todayIso } from '../lib/dates'
import { uid } from '../lib/format'

function clampDay(value) {
  return Math.max(1, Math.min(31, Number(value || 1)))
}

export default function SetupScreen({ data, setData }) {
  const [kind, setKind] = useState('paycheck')
  const [employer, setEmployer] = useState('')
  const [recurrence, setRecurrence] = useState('biweekly')
  const [firstDate, setFirstDate] = useState(todayIso())
  const [dayOne, setDayOne] = useState(1)
  const [dayTwo, setDayTwo] = useState(15)
  const [payMode, setPayMode] = useState('hourly')
  const [hourlyRate, setHourlyRate] = useState(
    data.settings.hourlyRate || 29.28,
  )
  const [regularHours, setRegularHours] = useState(80)
  const [annualSalary, setAnnualSalary] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (kind === 'paycheck' && recurrence === 'once') {
      setRecurrence('biweekly')
    }
  }, [kind, recurrence])

  useEffect(() => {
    if (recurrence !== 'semimonthly' || !firstDate) return

    const payday = Number(firstDate.slice(-2))
    if (!Number.isFinite(payday)) return

    if (payday <= 15) {
      setDayOne(payday)
      setDayTwo(Math.min(31, payday + 15))
    } else {
      setDayOne(Math.max(1, payday - 15))
      setDayTwo(payday)
    }
  }, [recurrence, firstDate])

  const finish = (skip = false) => {
    const cleanEmployer = employer.trim()
    const savedRecurrence =
      kind === 'paycheck' && recurrence === 'once'
        ? 'biweekly'
        : recurrence
    const semimonthlyDays = [clampDay(dayOne), clampDay(dayTwo)]
      .sort((a, b) => a - b)

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
            semimonthlyDays:
              savedRecurrence === 'semimonthly'
                ? semimonthlyDays
                : undefined,
            payMode: kind === 'paycheck' ? payMode : undefined,
            hourlyRate:
              kind === 'paycheck' && payMode === 'hourly'
                ? Number(hourlyRate || 0)
                : 0,
            regularHours:
              kind === 'paycheck' && payMode === 'hourly'
                ? Number(regularHours || 0)
                : 0,
            overtimeHours: 0,
            overtimeMultiplier: 1.5,
            annualSalary:
              kind === 'paycheck' && payMode === 'salary'
                ? Number(annualSalary || 0)
                : 0,
            amount:
              kind !== 'paycheck' ? Number(amount || 0) : 0,
            expectedNet: 0,
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

          <Field label={kind === 'paycheck' ? 'Pay frequency' : 'Schedule'}>
            <Segmented
              value={recurrence}
              onChange={setRecurrence}
              options={
                kind === 'paycheck'
                  ? [
                      ['weekly', 'Weekly'],
                      ['biweekly', 'Every 2 weeks'],
                      ['semimonthly', 'Twice a month'],
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

          <div className={recurrence === 'semimonthly' ? 'form-grid two' : ''}>
            <Field
              label={
                recurrence === 'once'
                  ? 'Date'
                  : kind === 'paycheck'
                    ? 'Next payday'
                    : 'First payment'
              }
            >
              <DateInput
                value={firstDate}
                onChange={(event) => setFirstDate(event.target.value)}
              />
            </Field>

            {recurrence === 'semimonthly' && (
              <Field label="Pay days">
                <div className="payday-pair">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOne}
                    onChange={(event) => setDayOne(event.target.value)}
                    aria-label="First pay day"
                  />
                  <span>and</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayTwo}
                    onChange={(event) => setDayTwo(event.target.value)}
                    aria-label="Second pay day"
                  />
                </div>
              </Field>
            )}
          </div>

          {kind === 'paycheck' && (
            <Field label="Pay type">
              <Segmented
                value={payMode}
                onChange={setPayMode}
                options={[
                  ['hourly', 'Hourly'],
                  ['salary', 'Salary'],
                ]}
              />
            </Field>
          )}

          {kind === 'paycheck' && payMode === 'hourly' && (
            <div className="form-grid two">
              <Field label="Hourly rate">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                  required
                />
              </Field>

              <Field label="Typical hours per check">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={regularHours}
                  onChange={(event) => setRegularHours(event.target.value)}
                  required
                />
              </Field>
            </div>
          )}

          {kind === 'paycheck' && payMode === 'salary' && (
            <Field label="Annual salary">
              <input
                type="number"
                step="100"
                min="0"
                value={annualSalary}
                onChange={(event) => setAnnualSalary(event.target.value)}
                placeholder="60000"
                required
              />
            </Field>
          )}

          {kind !== 'paycheck' && (
            <Field label="Amount">
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
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
