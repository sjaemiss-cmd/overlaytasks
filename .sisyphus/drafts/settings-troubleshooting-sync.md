# Draft: Remove Troubleshooting UI + Fix Cloud Sync Missing Tasks

## Requirements (confirmed)
- Remove the "Troubleshooting" section from Settings UI (currently under Cloud Sync settings).
- Diagnose and fix issue: login persists across restart, but tasks disappear; logs show sync loop with cursor, `pullDeltas` returns 0, `tasks:get` returns 0, and "Skipping tasks:set until profile is primed from remote".
- Plan must include: task dependency graph, parallel execution waves, explicit success criteria, verification commands/steps, detailed TODO list, and root-cause hypotheses with confirm/deny procedures.

## Observed Code References (initial)
- `src/App.tsx` contains a Cloud Sync Settings section and a literal "Troubleshooting" block with buttons that call `window.api.resetSync()` and `window.api.undeleteAll()`.
- `electron/main.ts` implements `ipcMain.handle("tasks:get")` and `ipcMain.handle("tasks:set")` and has gating: skip `tasks:set` when `state.tasks.length === 0` and attempt `syncEngine.primeProfileFromRemote(key)`.
- `electron/main.ts` `startSyncLoop()` primes from remote when profile tasks are empty.
- `electron/sync/syncEngine.ts` implements `pullDeltas()` with cursor-based delta pull, and `primeProfileFromRemote()` which calls `FirestoreRestClient.queryAllTasks()`.
- `electron/firestore/client.ts` implements `queryAllTasks()` via repeated `queryTaskDeltas()` using Firestore `timestampValue` filter on `updatedAt`.

## Open Questions
- Should reset/recovery buttons be removed entirely, or kept behind a hidden/dev-only toggle?
- What is the desired behavior when cloud profile is not yet primed: block edits, queue edits, or allow local edits and reconcile after prime?
- Do you want an automated regression test for the restart scenario, or is manual QA acceptable?

## Scope Boundaries
- INCLUDE: UI removal; fix sync logic so tasks reliably rehydrate after restart when logged in.
- EXCLUDE: New features beyond what is needed to resolve the missing-tasks bug.
