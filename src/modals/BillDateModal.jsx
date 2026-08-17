import { useState } from 'react'
import DateInput from '../components/DateInput'
import Field from '../components/Field'
import Modal from '../components/Modal'
import { shortDate } from '../lib/format'

export default function BillDateModal({ occurrence, onClose, onSave }) {
  const [date, setDate] = useState(occurrence.date)

  const submit = (event) => {
    event.preventDefault()
    onSave(date)
  }

  return (
    <Modal title="Change bill date" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-context">
          <strong>{occurrence.bill.name}</strong>
          <span>
            Originally scheduled for{' '}
            {shortDate(occurrence.scheduledDate || occurrence.date)}
          </span>
        </div>

        <Field label="Due date">
          <DateInput
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
            autoFocus
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
          <button type="submit" className="primary-button">
            Save date
          </button>
        </div>
      </form>
    </Modal>
  )
}
