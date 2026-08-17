import { useEffect, useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import Segmented from '../components/Segmented'
import {
  INCOME_CATEGORIES,
  SPENDING_CATEGORIES,
} from '../lib/constants'
import { todayIso } from '../lib/dates'
import { uid } from '../lib/format'

export default function TransactionModal({
  mode = 'transaction',
  item,
  onClose,
  onSave,
}) {
  const isPlanned = mode === 'planned' || item?.type === 'planned'
  const [type, setType] = useState(
    item?.type === 'deposit' ? 'deposit' : 'spent',
  )
  const [amount, setAmount] = useState(item?.amount ?? '')
  const [category, setCategory] = useState(
    item?.category || (isPlanned ? 'Shopping' : 'Food'),
  )
  const [name, setName] = useState(item?.name || '')
  const [date, setDate] = useState(item?.date || todayIso())

  useEffect(() => {
    if (item || isPlanned) return
    setCategory(type === 'deposit' ? 'Other income' : 'Food')
  }, [type, item, isPlanned])

  const categories =
    type === 'deposit' && !isPlanned
      ? INCOME_CATEGORIES
      : SPENDING_CATEGORIES

  const submit = (event) => {
    event.preventDefault()

    onSave({
      ...(item || {}),
      id: item?.id || uid('txn'),
      type: isPlanned ? 'planned' : type,
      amount: Number(amount || 0),
      category,
      name: name.trim(),
      date,
    })
  }

  const title = item
    ? isPlanned
      ? 'Edit planned purchase'
      : 'Edit transaction'
    : isPlanned
      ? 'Plan purchase'
      : 'Add transaction'

  return (
    <Modal title={title} onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        {!isPlanned && (
          <Field label="Type">
            <Segmented
              value={type}
              onChange={setType}
              options={[
                ['spent', 'Expense'],
                ['deposit', 'Income'],
              ]}
            />
          </Field>
        )}

        <Field label="Description">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={
              isPlanned
                ? 'New monitor, trip, chair...'
                : type === 'deposit'
                  ? 'Paycheck, refund, transfer...'
                  : 'Groceries, gas, lunch...'
            }
            required
            autoFocus
          />
        </Field>

        <div className="form-grid two">
          <Field label="Amount">
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

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Category">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((itemName) => (
              <option key={itemName} value={itemName}>
                {itemName}
              </option>
            ))}
          </select>
        </Field>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button">
            {item ? 'Save changes' : isPlanned ? 'Add planned purchase' : 'Add transaction'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
