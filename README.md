# Paycheck Budget

A React + Firebase paycheck budgeting app.

## Run locally

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
```

## Project structure

- `src/App.jsx` — top-level app routing/state orchestration
- `src/BudgetStore.jsx` — Firestore loading, migration, and writes
- `src/components/` — shared UI components
- `src/pages/` — full application pages
- `src/modals/` — add/edit flows
- `src/lib/` — dates, recurrence, formatting, constants, and budget calculations

## Firestore structure

Each signed-in user stores data under:

```text
users/{uid}
  settings/app
  income/{incomeId}
  bills/{billId}
  transactions/{transactionId}
  goals/{goalId}
```

On first load after upgrading, `BudgetStore.jsx` can migrate the previous
`users/{uid}/budget/main` document into the split collections.
