import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import Segmented from '../components/Segmented'
import { money, shortDate } from '../lib/format'
import { recurrenceLabel } from '../lib/recurrence'

function PaycheckSourceRow({ item, onEdit, onDelete }) {
  const employer =
    item.employer ||
    (item.name && item.name !== 'Paycheck' ? item.name : 'Employer not set')
  const paySummary =
    item.payMode === 'fixed'
      ? `${money(item.expectedNet || item.amount || 0)} expected`
      : `${money(item.hourlyRate || 0)}/hr · ${Number(item.regularHours || 0)} hrs`

  return (
    <div className="paycheck-source-row">
      <div className="paycheck-source-main">
        <strong>{employer}</strong>
        <span>
          {recurrenceLabel(item.recurrence, item.firstDate)} · {paySummary}
        </span>
        <small>Schedule begins {shortDate(item.firstDate)}</small>
      </div>

      <div className="row-action action-pair">
        <button
          type="button"
          className="text-button"
          onClick={() => onEdit(item)}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-button danger"
          onClick={() => onDelete(item.id)}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage({
  data,
  updateSettings,
  learnedNetPercent,
  paycheckSources,
  onAddPaycheck,
  onEditPaycheck,
  onDeletePaycheck,
}) {
  return (
    <div className="page settings-page">
      <header className="page-head">
        <div><h1>Settings</h1></div>
      </header>

      <section className="settings-section">
        <h2>Appearance</h2>

        <div className="settings-row">
          <div><strong>Theme</strong></div>
          <Segmented
            value={data.settings.themeMode}
            onChange={(themeMode) => updateSettings({ themeMode })}
            options={[
              ['dark', 'Dark'],
              ['light', 'Light'],
            ]}
          />
        </div>

        <div className="settings-row">
          <div><strong>Accent</strong></div>
          <div className="color-options">
            {['mint', 'blue', 'purple', 'orange'].map((accent) => (
              <button
                type="button"
                key={accent}
                className={`${accent} ${
                  data.settings.accentTheme === accent ? 'selected' : ''
                }`}
                onClick={() => updateSettings({ accentTheme: accent })}
                aria-label={accent}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section paycheck-settings-section">
        <div className="settings-section-head">
          <div>
            <h2>Paycheck sources</h2>
            <p>Recurring paychecks are managed here.</p>
          </div>
          <button
            type="button"
            className="small-button"
            onClick={onAddPaycheck}
          >
            + Add paycheck source
          </button>
        </div>

        {paycheckSources.length ? (
          <div className="paycheck-source-list">
            {paycheckSources.map((item) => (
              <PaycheckSourceRow
                key={item.id}
                item={item}
                onEdit={onEditPaycheck}
                onDelete={onDeletePaycheck}
              />
            ))}
          </div>
        ) : (
          <div className="settings-empty">
            No recurring paycheck sources added.
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>Paycheck estimates</h2>

        <div className="settings-row">
          <div>
            <strong>Default hourly rate</strong>
            <span>Used when adding a new hourly paycheck source.</span>
          </div>
          <input
            type="number"
            step="0.01"
            value={data.settings.hourlyRate}
            onChange={(event) =>
              updateSettings({
                hourlyRate: Number(event.target.value || 0),
              })
            }
          />
        </div>

        <div className="settings-row">
          <div>
            <strong>Take-home estimate</strong>
            <span>
              {learnedNetPercent != null
                ? `Learned rate: ${learnedNetPercent.toFixed(1)}%`
                : 'Percent of gross pay expected to reach your account.'}
            </span>
          </div>

          <div className="settings-suffix-input">
            <input
              type="number"
              step="0.1"
              value={data.settings.estimatedNetPercent}
              onChange={(event) =>
                updateSettings({
                  estimatedNetPercent: Number(event.target.value || 0),
                })
              }
            />
            <span>%</span>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <strong>Overtime multiplier</strong>
            <span>Usually 1.5× for time-and-a-half.</span>
          </div>
          <input
            type="number"
            step="0.1"
            min="1"
            value={data.settings.overtimeMultiplier}
            onChange={(event) =>
              updateSettings({
                overtimeMultiplier: Number(event.target.value || 1.5),
              })
            }
          />
        </div>

        <div className="settings-row">
          <div>
            <strong>Learn from recorded paychecks</strong>
            <span>Uses recorded deposits to improve the take-home estimate.</span>
          </div>
          <button
            type="button"
            className={`toggle ${data.settings.autoLearnNet ? 'on' : ''}`}
            onClick={() =>
              updateSettings({
                autoLearnNet: !data.settings.autoLearnNet,
              })
            }
          >
            <span />
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Account</h2>
        <div className="settings-row">
          <div><strong>{auth.currentUser?.email}</strong></div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => signOut(auth)}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
