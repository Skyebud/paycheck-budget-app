import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import Segmented from '../components/Segmented'

export default function SettingsPage({
  data,
  updateSettings,
  learnedNetPercent,
}) {
  return (
    <div className="page">
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

      <section className="settings-section">
        <h2>Income</h2>

        <div className="settings-row">
          <div><strong>Default hourly rate</strong></div>
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
            <strong>Estimated net rate</strong>
            <span>
              {learnedNetPercent != null
                ? `Learned rate: ${learnedNetPercent.toFixed(1)}%`
                : ''}
            </span>
          </div>

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
        </div>

        <div className="settings-row">
          <div><strong>Learn from actual pay</strong></div>
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
