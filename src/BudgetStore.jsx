import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { DEFAULT_SETTINGS } from './lib/constants'
import { uid } from './lib/format'

const BudgetContext = createContext(null)

function normalizeBudget(source = {}, profileSetupComplete = false) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(source.settings || {}),
  }

  const income = Array.isArray(source.income)
    ? source.income
    : (source.paychecks || []).map((paycheck) => ({
        id: paycheck.id || uid('income'),
        name: paycheck.label || 'Paycheck',
        kind: 'paycheck',
        recurrence: 'once',
        firstDate: paycheck.date,
        payMode: 'hourly',
        hourlyRate: settings.hourlyRate,
        regularHours: Number(paycheck.regularHours || 0),
        overtimeHours: Number(paycheck.overtimeHours || 0),
        overtimeMultiplier: settings.overtimeMultiplier,
        expectedNet: Number(paycheck.expectedNet || 0),
        actuals:
          paycheck.actualNet != null
            ? {
                [paycheck.date]: {
                  actualNet: Number(paycheck.actualNet),
                  regularHours: Number(paycheck.regularHours || 0),
                  overtimeHours: Number(paycheck.overtimeHours || 0),
                },
              }
            : {},
      }))

  const bills = Array.isArray(source.bills)
    ? source.bills.map((bill) => ({
        ...bill,
        id: bill.id || uid('bill'),
        scheduleType: bill.scheduleType || 'once',
        anchorDate: bill.anchorDate || bill.dueDate,
        paidDates: Array.isArray(bill.paidDates) ? bill.paidDates : [],
      }))
    : []

  const transactions = Array.isArray(source.transactions)
    ? source.transactions.map((item) => ({
        ...item,
        id: item.id || uid('txn'),
      }))
    : []

  const goals = Array.isArray(source.goals)
    ? source.goals.map((item) => ({
        ...item,
        id: item.id || uid('goal'),
      }))
    : []

  return {
    setupComplete:
      source.setupComplete === true ||
      profileSetupComplete === true ||
      income.length > 0 ||
      bills.length > 0,
    settings,
    income: income.map((item) => ({
      actuals: {},
      recurrence: 'once',
      kind: 'other',
      ...item,
      id: item.id || uid('income'),
    })),
    bills,
    transactions,
    goals,
  }
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean)

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, clean(item)]),
    )
  }

  return value
}

function different(a, b) {
  return JSON.stringify(clean(a)) !== JSON.stringify(clean(b))
}

function addCollectionChanges(
  batch,
  userId,
  collectionName,
  previousItems,
  nextItems,
) {
  let changed = false
  const previous = new Map(previousItems.map((item) => [item.id, item]))
  const next = new Map(nextItems.map((item) => [item.id, item]))

  next.forEach((item, id) => {
    const oldItem = previous.get(id)

    if (!oldItem || different(oldItem, item)) {
      batch.set(
        doc(db, 'users', userId, collectionName, id),
        clean(item),
      )
      changed = true
    }
  })

  previous.forEach((item, id) => {
    if (!next.has(id)) {
      batch.delete(doc(db, 'users', userId, collectionName, id))
      changed = true
    }
  })

  return changed
}

async function saveEntireBudget(userId, budget) {
  const batch = writeBatch(db)

  batch.set(
    doc(db, 'users', userId),
    {
      setupComplete: budget.setupComplete,
      schemaVersion: 2,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  batch.set(
    doc(db, 'users', userId, 'settings', 'app'),
    clean(budget.settings),
  )

  budget.income.forEach((item) => {
    batch.set(
      doc(db, 'users', userId, 'income', item.id),
      clean(item),
    )
  })

  budget.bills.forEach((item) => {
    batch.set(
      doc(db, 'users', userId, 'bills', item.id),
      clean(item),
    )
  })

  budget.transactions.forEach((item) => {
    batch.set(
      doc(db, 'users', userId, 'transactions', item.id),
      clean(item),
    )
  })

  budget.goals.forEach((item) => {
    batch.set(
      doc(db, 'users', userId, 'goals', item.id),
      clean(item),
    )
  })

  await batch.commit()
}

async function saveChanges(userId, previous, next) {
  const batch = writeBatch(db)
  let changed = false

  if (different(previous.settings, next.settings)) {
    batch.set(
      doc(db, 'users', userId, 'settings', 'app'),
      clean(next.settings),
    )
    changed = true
  }

  if (previous.setupComplete !== next.setupComplete) changed = true

  changed =
    addCollectionChanges(
      batch,
      userId,
      'income',
      previous.income,
      next.income,
    ) || changed

  changed =
    addCollectionChanges(
      batch,
      userId,
      'bills',
      previous.bills,
      next.bills,
    ) || changed

  changed =
    addCollectionChanges(
      batch,
      userId,
      'transactions',
      previous.transactions,
      next.transactions,
    ) || changed

  changed =
    addCollectionChanges(
      batch,
      userId,
      'goals',
      previous.goals,
      next.goals,
    ) || changed

  if (!changed) return

  batch.set(
    doc(db, 'users', userId),
    {
      setupComplete: next.setupComplete,
      schemaVersion: 2,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  await batch.commit()
}

export function BudgetProvider({ children }) {
  const [data, setDataState] = useState(null)
  const [error, setError] = useState('')
  const dataRef = useRef(null)
  const writeQueue = useRef(Promise.resolve())

  useEffect(() => {
    let cancelled = false

    async function loadBudget() {
      const user = auth.currentUser
      if (!user) return

      const userId = user.uid

      const [
        profileSnapshot,
        settingsSnapshot,
        incomeSnapshot,
        billsSnapshot,
        transactionsSnapshot,
        goalsSnapshot,
      ] = await Promise.all([
        getDoc(doc(db, 'users', userId)),
        getDoc(doc(db, 'users', userId, 'settings', 'app')),
        getDocs(collection(db, 'users', userId, 'income')),
        getDocs(collection(db, 'users', userId, 'bills')),
        getDocs(collection(db, 'users', userId, 'transactions')),
        getDocs(collection(db, 'users', userId, 'goals')),
      ])

      const schemaVersion = Number(
        profileSnapshot.data()?.schemaVersion || 0,
      )

      let budget

      if (schemaVersion < 2) {
        const legacySnapshot = await getDoc(
          doc(db, 'users', userId, 'budget', 'main'),
        )

        const hasSplitData =
          settingsSnapshot.exists() ||
          !incomeSnapshot.empty ||
          !billsSnapshot.empty ||
          !transactionsSnapshot.empty ||
          !goalsSnapshot.empty

        if (legacySnapshot.exists()) {
          budget = normalizeBudget(
            legacySnapshot.data(),
            profileSnapshot.data()?.setupComplete,
          )
        } else if (hasSplitData) {
          budget = normalizeBudget(
            {
              setupComplete:
                profileSnapshot.data()?.setupComplete === true,
              settings: settingsSnapshot.exists()
                ? settingsSnapshot.data()
                : {},
              income: incomeSnapshot.docs.map((item) => ({
                ...item.data(),
                id: item.data().id || item.id,
              })),
              bills: billsSnapshot.docs.map((item) => ({
                ...item.data(),
                id: item.data().id || item.id,
              })),
              transactions: transactionsSnapshot.docs.map((item) => ({
                ...item.data(),
                id: item.data().id || item.id,
              })),
              goals: goalsSnapshot.docs.map((item) => ({
                ...item.data(),
                id: item.data().id || item.id,
              })),
            },
            profileSnapshot.data()?.setupComplete,
          )
        } else {
          budget = normalizeBudget(
            {},
            profileSnapshot.data()?.setupComplete,
          )
        }

        await saveEntireBudget(userId, budget)
      } else {
        budget = normalizeBudget(
          {
            setupComplete:
              profileSnapshot.data()?.setupComplete === true,
            settings: settingsSnapshot.exists()
              ? settingsSnapshot.data()
              : {},
            income: incomeSnapshot.docs.map((item) => ({
              ...item.data(),
              id: item.data().id || item.id,
            })),
            bills: billsSnapshot.docs.map((item) => ({
              ...item.data(),
              id: item.data().id || item.id,
            })),
            transactions: transactionsSnapshot.docs.map((item) => ({
              ...item.data(),
              id: item.data().id || item.id,
            })),
            goals: goalsSnapshot.docs.map((item) => ({
              ...item.data(),
              id: item.data().id || item.id,
            })),
          },
          profileSnapshot.data()?.setupComplete,
        )
      }

      if (cancelled) return

      dataRef.current = budget
      setDataState(budget)

      localStorage.removeItem('paycheck-budget-v1')
      localStorage.removeItem('paycheck-budget-migration-owner')
    }

    loadBudget().catch((err) => {
      console.error(err)
      if (!cancelled) setError('Unable to load your budget.')
    })

    return () => {
      cancelled = true
    }
  }, [])

  const setData = useCallback((update) => {
    const previous = dataRef.current
    if (!previous) return

    const proposed =
      typeof update === 'function' ? update(previous) : update

    const next = normalizeBudget(
      proposed,
      proposed.setupComplete,
    )

    dataRef.current = next
    setDataState(next)

    const userId = auth.currentUser?.uid
    if (!userId) return

    writeQueue.current = writeQueue.current
      .then(() => saveChanges(userId, previous, next))
      .catch((err) => {
        console.error('Firestore save failed:', err)
        setError('A change could not be saved. Refresh and try again.')
      })
  }, [])

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h2>{error}</h2>
        </section>
      </main>
    )
  }

  if (!data) {
    return (
      <div className="auth-loading">
        <div className="auth-loader" />
      </div>
    )
  }

  return (
    <BudgetContext.Provider value={{ data, setData }}>
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)

  if (!context) {
    throw new Error('useBudget must be used inside BudgetProvider')
  }

  return context
}
