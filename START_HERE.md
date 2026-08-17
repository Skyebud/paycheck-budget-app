# Start Here

This folder is a complete replacement version of the app.

## Safest swap

1. Keep your current project folder as a backup for the moment.
2. Extract this folder beside it.
3. Open the new folder in VS Code.
4. Run:

```powershell
npm install
npm run dev
```

5. Sign in with the same Firebase account and confirm your existing budget loads.
6. Add one temporary bill or spending entry, refresh the browser, and confirm it remains.
7. Run:

```powershell
npm run build
```

## Git

The ZIP does not contain your hidden `.git` folder. Your GitHub repository is safe,
but if you literally delete the old local folder you will also delete its local Git metadata.

After the new folder is tested, either copy the old `.git` directory into the new
folder or reinitialize Git and reconnect the repository.

Do not delete the old folder until the new one has loaded your Firebase data successfully.
