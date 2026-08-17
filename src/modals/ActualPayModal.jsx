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
    existing.actualNet ?? '',
  )
  const [regularHours, setRegularHours] = useState(
    existing.regularHours ?? occurrence.item.regularHours ?? 0,
  )
  const [overtimeHours, setOvertimeHours] = useState(
    existing.overtimeHours ?? occurrence.item.overtimeHours ?? 0,
  )

  const submit = (event) => {
    event.preventDefault()

    onSave({
      actualNet: Number(actualNet || 0),
      regularHours: Number(regularHours || 0),
      overtimeHours: Number(overtimeHours || 0),
    })
  }

  return (
    <Modal
      title={`Actual pay · ${shortDate(occurrence.date)}`}
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <Field label="Actual net deposit">
          <input
            className="amount-input"
            type="number"
            step="0.01"
            value={actualNet}
            onChange={(event) => setActualNet(event.target.value)}
            required
            autoFocus
          />
        </Field>

        {occurrence.item.payMode !== 'fixed' && (
          <div className="form-grid two">
            <Field label="Regular hours">
              <input
                type="number"
                step="0.1"
                value={regularHours}
                onChange={(event) =>
                  setRegularHours(event.target.value)
                }
              />
            </Field>

            <Field label="Overtime hours">
              <input
                type="number"
                step="0.1"
                value={overtimeHours}
                onChange={(event) =>
                  setOvertimeHours(event.target.value)
                }
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
          <button className="primary-button">Save actual</button>
        </div>
      </form>
    </Modal>
  )
}
