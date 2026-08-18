import { useState } from 'react'
import Field from '../components/Field'
import Modal from '../components/Modal'
import { shortDate } from '../lib/format'

export default function ActualPayModal({
  occurrence,
  onClose,
  onSave,
}) {
  const existing = occurrence.actual || {}
  const [actualNet, setActualNet] = useState(
    existing.actualNet ?? occurrence.amount ?? '',
  )
  const [regularHours, setRegularHours] = useState(
    existing.regularHours ?? occurrence.item.regularHours ?? 0,
  )
  const [overtimeHours, setOvertimeHours] = useState(
    existing.overtimeHours ?? occurrence.item.overtimeHours ?? 0,
  )

  const submit = (event) => {
    event.preventDefault()

    const actual = {
      actualNet: Number(actualNet || 0),
    }

    if (occurrence.item.payMode === 'hourly') {
      actual.regularHours = Number(regularHours || 0)
      actual.overtimeHours = Number(overtimeHours || 0)
    }

    onSave(actual)
  }

  const sourceName = occurrence.item.employer || occurrence.item.name

  return (
    <Modal
      title={`Record deposit · ${shortDate(occurrence.date)}`}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="modal-context">
          <strong>{sourceName}</strong>
          <span>{occurrence.item.kind === 'paycheck' ? 'Paycheck' : 'Income'}</span>
        </div>

        <Field label="Deposit amount">
          <input
            className="amount-input"
            type="number"
            step="0.01"
            min="0"
            value={actualNet}
            onChange={(event) => setActualNet(event.target.value)}
            required
            autoFocus
          />
        </Field>

        {occurrence.item.kind === 'paycheck' && occurrence.item.payMode === 'hourly' && (
          <div className="form-grid two">
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
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="primary-button">Save deposit</button>
        </div>
      </form>
    </Modal>
  )
}
