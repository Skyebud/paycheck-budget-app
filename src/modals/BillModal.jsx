import { useState } from 'react'
import DateInput from '../components/DateInput'
import Field from '../components/Field'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import { BILL_CATEGORIES } from '../lib/constants'
import { toDate } from '../lib/dates'
import { shortDate, uid } from '../lib/format'
import { recurrenceLabel } from '../lib/recurrence'

export default function BillModal({
  bill,
  onClose,
  onSave,
}) {
  const [scheduleType, setScheduleType] = useState(
    bill?.scheduleType || 'once',
  )
  const [firstDate, setFirstDate] = useState(
    bill?.anchorDate || bill?.dueDate || '',
  )
  const [name, setName] = useState(bill?.name || '')
  const [amount, setAmount] = useState(bill?.amount || '')
  const [category, setCategory] = useState(
    bill?.category || 'Utilities',
  )

  const submit = (event) => {
    event.preventDefault()
    if (!firstDate) return

    onSave({
      ...(bill || {}),
      id: bill?.id || uid('bill'),
      name: name.trim(),
      amount: Number(amount || 0),
      category,
      scheduleType,
      anchorDate: firstDate,
      dueDate: firstDate,
      dayOfMonth:
        scheduleType === 'monthly'
          ? toDate(firstDate).getDate()
          : undefined,
      paidDates: bill?.paidDates || [],
      dateOverrides: bill?.dateOverrides || {},
    })
  }

  return (
    <Modal
      title={bill ? 'Edit bill' : 'Add bill'}
      onClose={onClose}
      wide
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="form-grid two">
          <Field label="Bill name">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rent, power, internet..."
              required
              autoFocus
            />
          </Field>

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
        </div>

        <Field label="Frequency">
          <Segmented
            value={scheduleType}
            onChange={setScheduleType}
            options={[
              ['once', 'One-time'],
              ['weekly', 'Weekly'],
              ['biweekly', 'Every 2 weeks'],
              ['monthly', 'Monthly'],
            ]}
          />
        </Field>

        <div className="form-grid two">
          <Field
            label={scheduleType === 'once' ? 'Due date' : 'First due date'}
          >
            <DateInput
              value={firstDate}
              onChange={(event) => setFirstDate(event.target.value)}
              required
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {BILL_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>

        {scheduleType !== 'once' && firstDate && (
          <div className="schedule-preview">
            <Icon name="calendar" />
            <span>
              Starts {shortDate(firstDate)} ·{' '}
              {recurrenceLabel(scheduleType, firstDate)}
            </span>
          </div>
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
            {bill ? 'Save changes' : 'Add bill'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
