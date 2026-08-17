import { useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import { SPENDING_CATEGORIES } from '../lib/constants'
import { todayIso } from '../lib/dates'
import { uid } from '../lib/format'

export default function TransactionModal({
  mode,
  onClose,
  onSave,
}) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(
    mode === 'spent' ? 'Food' : 'Planned',
  )
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayIso())

  const submit = (event) => {
    event.preventDefault()

    onSave({
      id: uid('txn'),
      type: mode,
      amount: Number(amount || 0),
      category,
      name: name.trim() || category,
      date,
    })
  }

  return (
    <Modal
      title={
        mode === 'spent' ? 'Add spending' : 'Add planned purchase'
      }
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <Field label="Amount">
          <input
            className="amount-input"
            type="number"
            step="0.01"
            autoFocus
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>

        {mode === 'spent' ? (
          <Field label="Category">
            <div className="chip-grid">
              {SPENDING_CATEGORIES.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={category === item ? 'active' : ''}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </Field>
        ) : (
          <Field label="Category">
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </Field>
        )}

        <Field label="Description">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Optional"
          />
        </Field>

        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary-button">Add</button>
        </div>
      </form>
    </Modal>
  )
}
