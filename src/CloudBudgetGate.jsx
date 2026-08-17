import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

const STORAGE_KEY = 'paycheck-budget-v1'
const MIGRATION_OWNER_KEY = 'paycheck-budget-migration-owner'

export default function CloudBudgetGate({ children }) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const lastSaved = useRef(null)
  const saving = useRef(false)

  useEffect(() => {
    let cancelled = false
    let syncTimer

    async function start() {
      const user = auth.currentUser

      if (!user) return

      const budgetRef = doc(db, 'users', user.uid, 'budget', 'main')
      const profileRef = doc(db, 'users', user.uid)

      const snapshot = await getDoc(budgetRef)

      // Returning user: load their Firestore budget
      if (snapshot.exists()) {
        const cloudData = snapshot.data()
        const json = JSON.stringify(cloudData)

        localStorage.setItem(STORAGE_KEY, json)
        localStorage.setItem(MIGRATION_OWNER_KEY, user.uid)

        lastSaved.current = json

        if (!cancelled) setStatus('ready')
        return
      }

      // New Firestore account: check whether THIS user owns
      // the existing browser budget.
      const existing = localStorage.getItem(STORAGE_KEY)
      const migrationOwner = localStorage.getItem(MIGRATION_OWNER_KEY)

      // First migration on this browser.
      // This lets us move your existing budget into your new account.
      if (existing && !migrationOwner) {
        const parsed = JSON.parse(existing)

        await setDoc(budgetRef, parsed)

        await setDoc(
          profileRef,
          {
            setupComplete: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )

        localStorage.setItem(MIGRATION_OWNER_KEY, user.uid)
        lastSaved.current = existing

        if (!cancelled) setStatus('ready')
        return
      }

      // Existing browser budget belongs to this same user
      if (existing && migrationOwner === user.uid) {
        const parsed = JSON.parse(existing)

        await setDoc(budgetRef, parsed)

        lastSaved.current = existing

        if (!cancelled) setStatus('ready')
        return
      }

      // Different/new account: do NOT reuse somebody else's browser data
      localStorage.removeItem(STORAGE_KEY)

      if (!cancelled) setStatus('setup')
    }

    start().catch((err) => {
      console.error(err)
      setError('Unable to load your budget.')
      setStatus('error')
    })

    // Temporary bridge:
    // watches the existing app's local data and syncs changes to Firestore.
    syncTimer = window.setInterval(async () => {
      const user = auth.currentUser

      if (!user || saving.current) return

      const current = localStorage.getItem(STORAGE_KEY)

      if (!current || current === lastSaved.current) return

      try {
        saving.current = true

        await setDoc(
          doc(db, 'users', user.uid, 'budget', 'main'),
          JSON.parse(current),
        )

        lastSaved.current = current
      } catch (err) {
        console.error('Budget sync failed:', err)
      } finally {
        saving.current = false
      }
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(syncTimer)
    }
  }, [])

  if (status === 'loading') {
    return (
      <div className="auth-loading">
        <div className="auth-loader" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h2>{error}</h2>
        </section>
      </main>
    )
  }

  if (status === 'setup') {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <div className="auth-logo">$</div>
            <div>
              <h1>Paycheck</h1>
              <span>Budget</span>
            </div>
          </div>

          <div className="auth-heading">
            <h2>Set up your budget</h2>
          </div>

          <p>Your account is ready. We'll set up your income and expenses next.</p>
        </section>
      </main>
    )
  }

  return children
}