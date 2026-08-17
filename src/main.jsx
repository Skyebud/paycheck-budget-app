import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import { BudgetProvider } from './BudgetStore.jsx'
import './styles.css'
import './checkbook.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthGate>
      <BudgetProvider>
        <App />
      </BudgetProvider>
    </AuthGate>
  </StrictMode>,
)
