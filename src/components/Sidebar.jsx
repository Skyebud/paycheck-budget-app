import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import Icon from './Icon'

const navItems = [
  ['dashboard', 'dashboard', 'Dashboard'],
  ['transactions', 'expenses', 'Transactions'],
  ['bills', 'calendar', 'Bills'],
  ['income', 'income', 'Income'],
  ['goals', 'goals', 'Goals'],
]

export default function Sidebar({ view, setView }) {
  return (
    <aside className="sidebar">
      <div className="brand-mark">P</div>

      <nav className="primary-nav">
        {navItems.map(([key, icon, label]) => (
          <button
            key={key}
            type="button"
            className={view === key ? 'active' : ''}
            onClick={() => setView(key)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={view === 'settings' ? 'active' : ''}
          onClick={() => setView('settings')}
        >
          <Icon name="settings" />
          <span>Settings</span>
        </button>

        <button type="button" onClick={() => signOut(auth)}>
          <Icon name="logout" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
