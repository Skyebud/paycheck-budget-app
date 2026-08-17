# Paycheck Budget

A paycheck-first personal budget planner built with React + Vite.

## Current version

- Dashboard centered on **Safe to Spend**
- Paycheck timeline
- Paycheck calculator with regular + overtime hours
- Bills assigned to specific paychecks
- Planned and spent transactions
- Savings / spending goals
- “Can I afford it?” quick check
- Configurable hourly rate, overtime multiplier, estimated take-home %, and safety buffer
- JSON data export
- Responsive mobile layout
- Data stored in browser `localStorage` for version 1

Starter data is preloaded with the current working budget:

- Aug 21 paycheck: $1,500 expected net
- Rent: $500
- Internet: $60
- Power: $122
- Water: $96.31
- Ergonomic chair: $350 planned
- Safe to spend: $371.69
- Sep 4 paycheck: $1,500 expected net with $500 rent
- Sep 18 paycheck: $1,500 expected net with $1,000 rent

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints in the terminal.

## Production build

```bash
npm run build
```

The production files are created in `dist/`.

## Next step: Firebase

Version 1 deliberately uses local storage so it works immediately without credentials. The next iteration can add:

1. Firebase Authentication
2. Cloud Firestore persistence
3. Firestore security rules
4. Firebase Hosting
5. Optional import/export and multi-device sync

No bank connection is included.
