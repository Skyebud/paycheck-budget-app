import { useEffect, useRef, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

const STORAGE_KEY = 'paycheck-budget-v1'
const MIGRATION_OWNER_KEY = 'paycheck-budget-migration-owner'

const emptyBudget = {
  setupComplete: false,
  settings: {},
  income: [],
  bills: [],
  transactions: [],
  goals: [],
}

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

      if (snapshot.exists()) {
        const json = JSON.stringify(snapshot.data())
        localStorage.setItem(STORAGE_KEY, json)
        localStorage.setItem(MIGRATION_OWNER_KEY, user.uid)
        lastSaved.current = json
        if (!cancelled) setStatus('ready')
      } else {
        const existing = localStorage.getItem(STORAGE_KEY)
        const migrationOwner = localStorage.getItem(MIGRATION_OWNER_KEY)
        let initial = emptyBudget

        if (existing && (!migrationOwner || migrationOwner === user.uid)) {
          try { initial = JSON.parse(existing) } catch { initial = emptyBudget }
        }

        const json = JSON.stringify(initial)
        localStorage.setItem(STORAGE_KEY, json)
        localStorage.setItem(MIGRATION_OWNER_KEY, user.uid)
        await setDoc(budgetRef, initial)
        await setDoc(profileRef, {
          setupComplete: initial.setupComplete === true || Boolean(initial.paychecks?.length || initial.income?.length || initial.bills?.length),
          updatedAt: serverTimestamp(),
        }, { merge: true })
        lastSaved.current = json
        if (!cancelled) setStatus('ready')
      }

      syncTimer = window.setInterval(async () => {
        if (saving.current) return
        const current = localStorage.getItem(STORAGE_KEY)
        if (!current || current === lastSaved.current) return

        try {
          const parsed = JSON.parse(current)
          saving.current = true
          await setDoc(budgetRef, parsed)
          await setDoc(profileRef, {
            setupComplete: parsed.setupComplete === true,
            updatedAt: serverTimestamp(),
          }, { merge: true })
          lastSaved.current = current
        } catch (err) {
          console.error('Budget sync failed:', err)
        } finally {
          saving.current = false
        }
      }, 700)
    }

    start().catch((err) => {
      console.error(err)
      if (!cancelled) {
        setError('Unable to load your budget.')
        setStatus('error')
      }
    })

    return () => {
      cancelled = true
      if (syncTimer) window.clearInterval(syncTimer)
    }
  }, [])

  if (status === 'loading') return <div className="auth-loading"><div className="auth-loader" /></div>
  if (status === 'error') return <main className="auth-page"><section className="auth-card"><h2>{error}</h2></section></main>
  return children
}
