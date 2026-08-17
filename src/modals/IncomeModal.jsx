import { useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import { uid } from '../lib/format'

export default function IncomeModal({
  item,
  onClose,
  onSave,
}) {
  const [recurrence, setRecurrence] = useState(
    item?.recurrence || 'once',
  )
  const [firstDate, setFirstDate] = useState(item?.firstDate || '')
  const [name, setName] = useState(item?.name || '')
  const [amount, setAmount] = useState(
    item?.amount ?? item?.expectedNet ?? '',
  )

  const submit = (event) => {
    event.preventDefault()
    if (!firstDate || !name.trim()) return

    onSave({
      ...(item || {}),
      id: item?.id || uid('income'),
      name: name.trim(),
      kind: 'other',
      recurrence,
      firstDate,
      amount: Number(amount || 0),
      expectedNet: Number(amount || 0),
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
        <Field label="Income name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Refund, side job, reimbursement..."
            autoFocus
            required
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

          <Field label="Expected amount">
            <input
              className="amount-input"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </Field>
        </div>

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
