import { useEffect, useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import { uid } from '../lib/format'

export default function IncomeModal({
  item,
  settings,
  onClose,
  onSave,
}) {
  const [kind, setKind] = useState(item?.kind || 'paycheck')
  const [recurrence, setRecurrence] = useState(
    item?.recurrence || 'once',
  )
  const [firstDate, setFirstDate] = useState(item?.firstDate || '')
  const [name, setName] = useState(item?.name || 'Paycheck')
  const [payMode, setPayMode] = useState(item?.payMode || 'hourly')
  const [hourlyRate, setHourlyRate] = useState(
    item?.hourlyRate ?? settings.hourlyRate,
  )
  const [regularHours, setRegularHours] = useState(
    item?.regularHours ?? 80,
  )
  const [overtimeHours, setOvertimeHours] = useState(
    item?.overtimeHours ?? 0,
  )
  const [amount, setAmount] = useState(
    item?.amount ?? item?.expectedNet ?? '',
  )

  useEffect(() => {
    if (!item) setName(kind === 'paycheck' ? 'Paycheck' : 'Income')
  }, [kind, item])

  const submit = (event) => {
    event.preventDefault()
    if (!firstDate) return

    onSave({
      ...(item || {}),
      id: item?.id || uid('income'),
      name:
        name.trim() ||
        (kind === 'paycheck' ? 'Paycheck' : 'Income'),
      kind,
      recurrence,
      firstDate,
      payMode,
      hourlyRate: Number(hourlyRate || 0),
      regularHours: Number(regularHours || 0),
      overtimeHours: Number(overtimeHours || 0),
      overtimeMultiplier: Number(
        item?.overtimeMultiplier ||
          settings.overtimeMultiplier ||
          1.5,
      ),
      amount: Number(amount || 0),
      expectedNet:
        payMode === 'fixed'
          ? Number(amount || 0)
          : Number(item?.expectedNet || 0),
      actuals: item?.actuals || {},
    })
  }

  return (
    <Modal
      title={item ? 'Edit income' : 'Add income'}
      onClose={onClose}
      wide
    >
      <form className="modal-form" onSubmit={submit}>
        <Field label="Income type">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              ['paycheck', 'Paycheck'],
              ['other', 'Other income'],
            ]}
          />
        </Field>

        <Field label="Frequency">
          <Segmented
            value={recurrence}
            onChange={setRecurrence}
            options={[
              ['once', 'One-time'],
              ['weekly', 'Weekly'],
              ['biweekly', 'Every 2 weeks'],
              ['monthly', 'Monthly'],
            ]}
          />
        </Field>

        <div className="form-grid two">
          <Field label={recurrence === 'once' ? 'Deposit date' : 'First deposit date'}>
            <input
              type="date"
              value={firstDate}
              onChange={(event) => setFirstDate(event.target.value)}
              required
            />
          </Field>

          <Field label="Name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </Field>
        </div>

        {kind === 'paycheck' && (
          <Field label="Pay type">
            <Segmented
              value={payMode}
              onChange={setPayMode}
              options={[
                ['hourly', 'Hourly'],
                ['fixed', 'Fixed amount'],
              ]}
            />
          </Field>
        )}

        {kind === 'paycheck' && payMode === 'hourly' ? (
          <div className="form-grid three">
            <Field label="Hourly rate">
              <input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(event) => setHourlyRate(event.target.value)}
                required
              />
            </Field>

            <Field label="Regular hours">
              <input
                type="number"
                step="0.1"
                value={regularHours}
                onChange={(event) => setRegularHours(event.target.value)}
              />
            </Field>

            <Field label="Overtime hours">
              <input
                type="number"
                step="0.1"
                value={overtimeHours}
                onChange={(event) => setOvertimeHours(event.target.value)}
              />
            </Field>
          </div>
        ) : (
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

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button">
            {item ? 'Save changes' : 'Add income'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
