import { useEffect, useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import { uid } from '../lib/format'

function clampDay(value) {
  return Math.max(1, Math.min(31, Number(value || 1)))
}

export default function PaycheckSourceModal({
  item,
  settings,
  onClose,
  onSave,
}) {
  const [employer, setEmployer] = useState(
    item?.employer || (item?.name !== 'Paycheck' ? item?.name : '') || '',
  )
  const [recurrence, setRecurrence] = useState(
    item?.recurrence && item.recurrence !== 'once'
      ? item.recurrence
      : 'biweekly',
  )
  const [firstDate, setFirstDate] = useState(item?.firstDate || '')
  const [dayOne, setDayOne] = useState(
    item?.semimonthlyDays?.[0] ?? 1,
  )
  const [dayTwo, setDayTwo] = useState(
    item?.semimonthlyDays?.[1] ?? 15,
  )
  const [payMode, setPayMode] = useState(item?.payMode || 'hourly')
  const [hourlyRate, setHourlyRate] = useState(
    item?.hourlyRate ?? settings.hourlyRate ?? '',
  )
  const [regularHours, setRegularHours] = useState(
    item?.regularHours ?? 80,
  )
  const [overtimeHours, setOvertimeHours] = useState(
    item?.overtimeHours ?? 0,
  )
  const [fixedAmount, setFixedAmount] = useState(
    item?.expectedNet ?? item?.amount ?? '',
  )

  useEffect(() => {
    if (recurrence !== 'semimonthly' || !firstDate || item?.semimonthlyDays) {
      return
    }

    const payday = Number(firstDate.slice(-2))
    if (!Number.isFinite(payday)) return

    if (payday <= 15) {
      setDayOne(payday)
      setDayTwo(Math.min(31, payday + 15))
    } else {
      setDayOne(Math.max(1, payday - 15))
      setDayTwo(payday)
    }
  }, [recurrence, firstDate, item])

  const submit = (event) => {
    event.preventDefault()
    if (!employer.trim() || !firstDate) return

    const semimonthlyDays = [clampDay(dayOne), clampDay(dayTwo)]
      .sort((a, b) => a - b)

    onSave({
      ...(item || {}),
      id: item?.id || uid('income'),
      kind: 'paycheck',
      employer: employer.trim(),
      name: employer.trim(),
      recurrence,
      firstDate,
      semimonthlyDays:
        recurrence === 'semimonthly' ? semimonthlyDays : undefined,
      payMode,
      hourlyRate: Number(hourlyRate || 0),
      regularHours: Number(regularHours || 0),
      overtimeHours: Number(overtimeHours || 0),
      overtimeMultiplier: Number(
        item?.overtimeMultiplier || settings.overtimeMultiplier || 1.5,
      ),
      amount: payMode === 'fixed' ? Number(fixedAmount || 0) : 0,
      expectedNet:
        payMode === 'fixed'
          ? Number(fixedAmount || 0)
          : Number(item?.expectedNet || 0),
      actuals: item?.actuals || {},
    })
  }

  return (
    <Modal
      title={item ? 'Edit paycheck source' : 'Add paycheck source'}
      onClose={onClose}
      wide
    >
      <form className="modal-form" onSubmit={submit}>
        <Field label="Employer or company">
          <input
            value={employer}
            onChange={(event) => setEmployer(event.target.value)}
            placeholder="DeVry University"
            autoFocus
            required
          />
        </Field>

        <Field label="Pay frequency">
          <Segmented
            value={recurrence}
            onChange={setRecurrence}
            options={[
              ['weekly', 'Weekly'],
              ['biweekly', 'Every 2 weeks'],
              ['semimonthly', 'Twice a month'],
              ['monthly', 'Monthly'],
            ]}
          />
        </Field>

        <div className="form-grid two">
          <Field label="Next payday">
            <input
              type="date"
              value={firstDate}
              onChange={(event) => setFirstDate(event.target.value)}
              required
            />
          </Field>

          {recurrence === 'semimonthly' ? (
            <Field label="Pay days">
              <div className="payday-pair">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOne}
                  onChange={(event) => setDayOne(event.target.value)}
                  aria-label="First pay day"
                  required
                />
                <span>and</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayTwo}
                  onChange={(event) => setDayTwo(event.target.value)}
                  aria-label="Second pay day"
                  required
                />
              </div>
            </Field>
          ) : (
            <div />
          )}
        </div>

        <Field label="Pay type">
          <Segmented
            value={payMode}
            onChange={setPayMode}
            options={[
              ['hourly', 'Hourly'],
              ['fixed', 'Fixed deposit'],
            ]}
          />
        </Field>

        {payMode === 'hourly' ? (
          <div className="form-grid three">
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

            <Field label="Regular hours per check">
              <input
                type="number"
                step="0.1"
                min="0"
                value={regularHours}
                onChange={(event) => setRegularHours(event.target.value)}
                required
              />
            </Field>

            <Field label="Typical overtime hours">
              <input
                type="number"
                step="0.1"
                min="0"
                value={overtimeHours}
                onChange={(event) => setOvertimeHours(event.target.value)}
              />
            </Field>
          </div>
        ) : (
          <Field label="Expected deposit">
            <input
              className="amount-input"
              type="number"
              step="0.01"
              min="0"
              value={fixedAmount}
              onChange={(event) => setFixedAmount(event.target.value)}
              required
            />
          </Field>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button">
            {item ? 'Save changes' : 'Add paycheck source'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
