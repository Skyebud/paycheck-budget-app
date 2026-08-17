import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import Segmented from '../components/Segmented'

export default function SettingsPage({
  data,
  updateSettings,
  learnedNetPercent,
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
      </section>

      <section className="settings-section">
        <details className="advanced-settings">
          <summary>Advanced paycheck settings</summary>

          <div className="advanced-settings-body">
            <div className="settings-row">
              <div>
                <strong>Default hourly rate</strong>
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
                {learnedNetPercent != null && (
                  <span>
                    Learned rate: {learnedNetPercent.toFixed(1)}%
                  </span>
                )}
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
                <strong>Default overtime multiplier</strong>
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
          </div>
        </details>
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
