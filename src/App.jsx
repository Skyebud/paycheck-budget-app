import { useEffect, useMemo, useState } from 'react'
import { useBudget } from './BudgetStore'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import ExpensesPage from './pages/ExpensesPage'
import GoalsPage from './pages/GoalsPage'
import IncomePage from './pages/IncomePage'
import SettingsPage from './pages/SettingsPage'
import SetupScreen from './pages/SetupScreen'
import ActualPayModal from './modals/ActualPayModal'
import BillModal from './modals/BillModal'
import IncomeModal from './modals/IncomeModal'
import TransactionModal from './modals/TransactionModal'
import { calculateBudgetView } from './lib/budgetMath'

export default function App() {
  const { data, setData } = useBudget()

  const [view, setView] = useState('dashboard')
  const [incomeTab, setIncomeTab] = useState('overview')
  const [expenseTab, setExpenseTab] = useState('overview')
  const [modal, setModal] = useState(null)
  const [editingIncome, setEditingIncome] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [actualTarget, setActualTarget] = useState(null)

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

  const markBillPaid = (occurrence) => {
    setData((current) => ({
      ...current,
      bills: current.bills.map((bill) =>
        bill.id === occurrence.bill.id
          ? {
              ...bill,
              paidDates: bill.paidDates.includes(occurrence.date)
                ? bill.paidDates.filter(
                    (date) => date !== occurrence.date,
                  )
                : [...bill.paidDates, occurrence.date],
            }
          : bill,
      ),
    }))
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

  const deleteTransaction = (id) =>
    setData((current) => ({
      ...current,
      transactions: current.transactions.filter(
        (transaction) => transaction.id !== id,
      ),
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
            nextIncome={budgetView.nextIncome}
            cycleEnd={budgetView.cycleEnd}
            safeToSpend={budgetView.safeToSpend}
            billsTotal={budgetView.billsTotal}
            plannedTotal={budgetView.plannedTotal}
            spentTotal={budgetView.spentTotal}
            rows={budgetView.upcomingRows}
            markBillPaid={markBillPaid}
            onAddIncome={() => {
              setEditingIncome(null)
              setModal('income')
            }}
            onAddBill={() => {
              setEditingBill(null)
              setModal('bill')
            }}
            onAddSpending={() => setModal('spending')}
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

        {view === 'expenses' && (
          <ExpensesPage
            tab={expenseTab}
            setTab={setExpenseTab}
            bills={data.bills}
            billOccurrences={budgetView.billOccurrences}
            transactions={data.transactions}
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
            onAddSpending={() => setModal('spending')}
            onAddPlanned={() => setModal('planned')}
            onDeleteTransaction={deleteTransaction}
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

      {modal === 'spending' && (
        <TransactionModal
          mode="spent"
          onClose={() => setModal(null)}
          onSave={(transaction) => {
            setData((current) => ({
              ...current,
              transactions: [...current.transactions, transaction],
            }))
            setModal(null)
          }}
        />
      )}

      {modal === 'planned' && (
        <TransactionModal
          mode="planned"
          onClose={() => setModal(null)}
          onSave={(transaction) => {
            setData((current) => ({
              ...current,
              transactions: [...current.transactions, transaction],
            }))
            setModal(null)
          }}
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
            setData((current) => ({
              ...current,
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
            }))
            setModal(null)
            setActualTarget(null)
          }}
        />
      )}
    </div>
  )
}
