import { useEffect, useMemo, useState } from 'react'
import { useBudget } from './BudgetStore'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import TransactionsPage from './pages/TransactionsPage'
import BillsPage from './pages/BillsPage'
import GoalsPage from './pages/GoalsPage'
import IncomePage from './pages/IncomePage'
import SettingsPage from './pages/SettingsPage'
import SetupScreen from './pages/SetupScreen'
import ActualPayModal from './modals/ActualPayModal'
import BillDateModal from './modals/BillDateModal'
import BillModal from './modals/BillModal'
import IncomeModal from './modals/IncomeModal'
import TransactionModal from './modals/TransactionModal'
import { calculateBudgetView } from './lib/budgetMath'
import { todayIso } from './lib/dates'

function transactionEffect(transaction) {
  const amount = Number(transaction?.amount || 0)
  if (transaction?.type === 'deposit') return amount
  if (transaction?.type === 'spent') return -amount
  return 0
}

export default function App() {
  const { data, setData } = useBudget()

  const [view, setView] = useState('dashboard')
  const [incomeTab, setIncomeTab] = useState('overview')
  const [transactionTab, setTransactionTab] = useState('all')
  const [modal, setModal] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [actualTarget, setActualTarget] = useState(null)
  const [billDateTarget, setBillDateTarget] = useState(null)

  useEffect(() => {
    document.documentElement.dataset.theme =
      data.settings.themeMode || 'dark'
    document.documentElement.dataset.accent =
      data.settings.accentTheme || 'mint'
  }, [data.settings.themeMode, data.settings.accentTheme])

  const budgetView = useMemo(
    () => calculateBudgetView(data),
    [data],
  )

  const updateSettings = (patch) =>
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...patch,
      },
    }))

  const saveTransaction = (transaction) => {
    setData((current) => {
      const existing = editingTransaction
        ? current.transactions.find(
            (item) => item.id === editingTransaction.id,
          )
        : null

      const balanceChange =
        transactionEffect(transaction) - transactionEffect(existing)

      return {
        ...current,
        settings: {
          ...current.settings,
          currentBalance:
            Number(current.settings.currentBalance || 0) + balanceChange,
        },
        transactions: existing
          ? current.transactions.map((item) =>
              item.id === transaction.id ? transaction : item,
            )
          : [...current.transactions, transaction],
      }
    })

    setEditingTransaction(null)
    setModal(null)
  }

  const deleteTransaction = (id) => {
    setData((current) => {
      const transaction = current.transactions.find(
        (item) => item.id === id,
      )

      return {
        ...current,
        settings: {
          ...current.settings,
          currentBalance:
            Number(current.settings.currentBalance || 0) -
            transactionEffect(transaction),
        },
        transactions: current.transactions.filter(
          (item) => item.id !== id,
        ),
      }
    })
  }

  const markBillPaid = (occurrence) => {
    setData((current) => {
      const scheduledDate =
        occurrence.scheduledDate || occurrence.date
      const paidDates = occurrence.bill.paidDates || []
      const alreadyPaid =
        paidDates.includes(scheduledDate) ||
        paidDates.includes(occurrence.date)
      const paymentId =
        `billpay-${occurrence.bill.id}-${scheduledDate}`
      const payment = current.transactions.find(
        (transaction) => transaction.id === paymentId,
      )
      const amount = Number(occurrence.bill.amount || 0)

      let transactions = current.transactions
      let currentBalance = Number(
        current.settings.currentBalance || 0,
      )

      if (alreadyPaid) {
        if (payment) {
          transactions = transactions.filter(
            (transaction) => transaction.id !== paymentId,
          )
          currentBalance += Number(payment.amount || 0)
        }
      } else if (!payment) {
        transactions = [
          ...transactions,
          {
            id: paymentId,
            type: 'spent',
            amount,
            category: occurrence.bill.category || 'Bill',
            name: occurrence.bill.name,
            date: todayIso(),
            sourceBillId: occurrence.bill.id,
            sourceOccurrenceDate: scheduledDate,
          },
        ]
        currentBalance -= amount
      }

      return {
        ...current,
        settings: {
          ...current.settings,
          currentBalance,
        },
        transactions,
        bills: current.bills.map((bill) =>
          bill.id === occurrence.bill.id
            ? {
                ...bill,
                paidDates: alreadyPaid
                  ? paidDates.filter(
                      (date) =>
                        date !== scheduledDate &&
                        date !== occurrence.date,
                    )
                  : [...paidDates, scheduledDate],
              }
            : bill,
        ),
      }
    })
  }

  const changeBillDate = (newDate) => {
    if (!billDateTarget) return

    setData((current) => ({
      ...current,
      bills: current.bills.map((bill) => {
        if (bill.id !== billDateTarget.bill.id) return bill

        const scheduledDate =
          billDateTarget.scheduledDate || billDateTarget.date
        const overrides = { ...(bill.dateOverrides || {}) }

        if (newDate === scheduledDate) {
          delete overrides[scheduledDate]
        } else {
          overrides[scheduledDate] = newDate
        }

        return {
          ...bill,
          dateOverrides: overrides,
        }
      }),
    }))

    setBillDateTarget(null)
    setModal(null)
  }

  const deleteIncome = (id) =>
    setData((current) => ({
      ...current,
      income: current.income.filter((item) => item.id !== id),
    }))

  const deleteBill = (id) =>
    setData((current) => ({
      ...current,
      bills: current.bills.filter((bill) => bill.id !== id),
    }))

  if (!data.setupComplete) {
    return <SetupScreen data={data} setData={setData} />
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} />

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            currentBalance={budgetView.currentBalance}
            projectedBalance={budgetView.projectedBalance}
            nextIncome={budgetView.nextIncome}
            billsTotal={budgetView.billsTotal}
            recentActivity={budgetView.recentActivity}
            upcomingRows={budgetView.checkbookUpcoming}
            onSetBalance={(value) =>
              updateSettings({ currentBalance: value })
            }
            onAddTransaction={() => {
              setEditingTransaction(null)
              setModal('transaction')
            }}
            onAddBill={() => {
              setEditingBill(null)
              setModal('bill')
            }}
            onAddIncome={() => {
              setEditingIncome(null)
              setModal('income')
            }}
            onTogglePaid={markBillPaid}
          />
        )}

        {view === 'transactions' && (
          <TransactionsPage
            tab={transactionTab}
            setTab={setTransactionTab}
            currentBalance={budgetView.currentBalance}
            ledger={budgetView.transactionLedger}
            planned={budgetView.plannedTransactions}
            onAddTransaction={() => {
              setEditingTransaction(null)
              setModal('transaction')
            }}
            onAddPlanned={() => {
              setEditingTransaction(null)
              setModal('planned')
            }}
            onEditTransaction={(transaction) => {
              setEditingTransaction(transaction)
              setModal(
                transaction.type === 'planned'
                  ? 'planned'
                  : 'transaction',
              )
            }}
            onDeleteTransaction={deleteTransaction}
          />
        )}

        {view === 'bills' && (
          <BillsPage
            bills={data.bills}
            occurrences={budgetView.billOccurrences}
            onAddBill={() => {
              setEditingBill(null)
              setModal('bill')
            }}
            onEditBill={(bill) => {
              setEditingBill(bill)
              setModal('bill')
            }}
            onDeleteBill={deleteBill}
            onTogglePaid={markBillPaid}
            onChangeDate={(occurrence) => {
              setBillDateTarget(occurrence)
              setModal('bill-date')
            }}
          />
        )}

        {view === 'income' && (
          <IncomePage
            tab={incomeTab}
            setTab={setIncomeTab}
            income={data.income}
            occurrences={budgetView.incomeOccurrences}
            effectiveNetPercent={budgetView.effectiveNetPercent}
            learnedNetPercent={budgetView.learnedNetPercent}
            onAdd={() => {
              setEditingIncome(null)
              setModal('income')
            }}
            onEdit={(item) => {
              setEditingIncome(item)
              setModal('income')
            }}
            onDelete={deleteIncome}
            onRecord={(occurrence) => {
              setActualTarget(occurrence)
              setModal('actual')
            }}
          />
        )}

        {view === 'goals' && (
          <GoalsPage data={data} setData={setData} />
        )}

        {view === 'settings' && (
          <SettingsPage
            data={data}
            updateSettings={updateSettings}
            learnedNetPercent={budgetView.learnedNetPercent}
          />
        )}
      </main>

      {modal === 'transaction' && (
        <TransactionModal
          mode="transaction"
          item={editingTransaction}
          onClose={() => {
            setModal(null)
            setEditingTransaction(null)
          }}
          onSave={saveTransaction}
        />
      )}

      {modal === 'planned' && (
        <TransactionModal
          mode="planned"
          item={editingTransaction}
          onClose={() => {
            setModal(null)
            setEditingTransaction(null)
          }}
          onSave={saveTransaction}
        />
      )}

      {modal === 'income' && (
        <IncomeModal
          item={editingIncome}
          settings={data.settings}
          onClose={() => {
            setModal(null)
            setEditingIncome(null)
          }}
          onSave={(item) => {
            setData((current) => ({
              ...current,
              income: editingIncome
                ? current.income.map((entry) =>
                    entry.id === item.id ? item : entry,
                  )
                : [...current.income, item],
            }))
            setModal(null)
            setEditingIncome(null)
          }}
        />
      )}

      {modal === 'bill' && (
        <BillModal
          bill={editingBill}
          onClose={() => {
            setModal(null)
            setEditingBill(null)
          }}
          onSave={(bill) => {
            setData((current) => ({
              ...current,
              bills: editingBill
                ? current.bills.map((entry) =>
                    entry.id === bill.id ? bill : entry,
                  )
                : [...current.bills, bill],
            }))
            setModal(null)
            setEditingBill(null)
          }}
        />
      )}

      {modal === 'bill-date' && billDateTarget && (
        <BillDateModal
          occurrence={billDateTarget}
          onClose={() => {
            setModal(null)
            setBillDateTarget(null)
          }}
          onSave={changeBillDate}
        />
      )}

      {modal === 'actual' && actualTarget && (
        <ActualPayModal
          occurrence={actualTarget}
          onClose={() => {
            setModal(null)
            setActualTarget(null)
          }}
          onSave={(actual) => {
            setData((current) => {
              const transactionId =
                `income-${actualTarget.item.id}-${actualTarget.date}`
              const existingTransaction = current.transactions.find(
                (transaction) => transaction.id === transactionId,
              )
              const newAmount = Number(actual.actualNet || 0)
              const oldAmount = Number(existingTransaction?.amount || 0)
              const balanceChange = newAmount - oldAmount

              const depositTransaction = {
                id: transactionId,
                type: 'deposit',
                amount: newAmount,
                category: 'Paycheck',
                name: actualTarget.item.name,
                date: actualTarget.date,
                sourceIncomeId: actualTarget.item.id,
                sourceOccurrenceDate: actualTarget.date,
              }

              return {
                ...current,
                settings: {
                  ...current.settings,
                  currentBalance:
                    Number(current.settings.currentBalance || 0) +
                    balanceChange,
                },
                transactions: existingTransaction
                  ? current.transactions.map((transaction) =>
                      transaction.id === transactionId
                        ? depositTransaction
                        : transaction,
                    )
                  : [...current.transactions, depositTransaction],
                income: current.income.map((item) =>
                  item.id === actualTarget.item.id
                    ? {
                        ...item,
                        actuals: {
                          ...(item.actuals || {}),
                          [actualTarget.date]: actual,
                        },
                      }
                    : item,
                ),
              }
            })
            setModal(null)
            setActualTarget(null)
          }}
        />
      )}
    </div>
  )
}
