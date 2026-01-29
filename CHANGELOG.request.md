## Change Log (OpenCode Requests)

### 2026-01-29 18:00 KST
- Request summary: Document fix plan and implement improvements (DnD order, task edit, tray, transparency, IPC types, persistence, tick cadence, security).
- Files touched: FIX_PLAN.md, src/App.tsx, src/components/TaskItem.tsx, src/hooks/useTaskStore.ts, src/hooks/useTimeCheck.ts, src/index.css, electron/main.ts, electron/preload.cts, shared/types.ts, src/types.ts, index.html.
- Commands run: none.
- Verification: LSP diagnostics attempted; typescript-language-server not installed.
- Result: success (changes applied).

### 2026-01-29 18:12 KST
- Request summary: Match mini-mode progress scale to normal bar; add Hold/Restore/Resume actions.
- Files touched: src/App.tsx, src/components/TaskItem.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:18 KST
- Request summary: Keep title bar draggable header fixed while scrolling.
- Files touched: src/components/CustomTitleBar.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:24 KST
- Request summary: Add mini-mode heartbeat animation when deadline < 180 minutes.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:31 KST
- Request summary: Replace mini-mode pulse with heartbeat animation for stronger effect.
- Files touched: tailwind.config.ts, src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:38 KST
- Request summary: Make mini-mode heartbeat animation visibly stronger using CSS keyframes.
- Files touched: src/index.css, src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:44 KST
- Request summary: Prevent heartbeat scale from clipping by wrapping title bar.
- Files touched: src/components/CustomTitleBar.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:49 KST
- Request summary: Reduce heartbeat scale and remove red glow to avoid clipping and distraction.
- Files touched: src/index.css.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 18:56 KST
- Request summary: Hide mini-mode scrollbar.
- Files touched: src/index.css.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:03 KST
- Request summary: Style normal-mode scrollbar to match UI.
- Files touched: src/index.css.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:08 KST
- Request summary: Refine scrollbar to slimmer modern theme-aligned style.
- Files touched: src/index.css.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:14 KST
- Request summary: Apply themed scrollbar styling to all scrollable elements in normal mode.
- Files touched: src/index.css.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:24 KST
- Request summary: Replace native scrollbar with custom internal scrollbar synced to scroll.
- Files touched: src/App.tsx, src/index.css.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:31 KST
- Request summary: Re-center content while keeping custom scrollbar space.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:40 KST
- Request summary: Convert add form to accordion and pin bottom tabs.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:48 KST
- Request summary: Reduce bottom padding under task list and add accordion animation.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 19:56 KST
- Request summary: Persist window size/position on resize/move.
- Files touched: electron/main.ts.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 20:03 KST
- Request summary: Auto-hide custom scrollbar after scrolling.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 20:09 KST
- Request summary: Change task drag handle icon to single dot.
- Files touched: src/components/TaskItem.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 20:15 KST
- Request summary: Increase mini-mode height to avoid bottom clipping.
- Files touched: src/App.tsx, electron/main.ts.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 20:20 KST
- Request summary: Remove dot from drag handle, keep empty circle.
- Files touched: src/components/TaskItem.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 20:40 KST
- Request summary: Implement full settings system (UI, persistence, behaviors).
- Files touched: src/App.tsx, src/index.css, src/components/CustomTitleBar.tsx, src/components/TaskItem.tsx, src/hooks/useTaskStore.ts, src/utils/sortTasks.ts, electron/main.ts, electron/preload.cts, electron/types.ts, shared/types.ts, src/types.ts.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 20:58 KST
- Request summary: Add language setting (ko/en, default ko) and startup launch option.
- Files touched: src/App.tsx, src/components/TaskItem.tsx, src/types.ts, src/index.css, electron/main.ts, electron/preload.cts, electron/types.ts, shared/types.ts.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 21:06 KST
- Request summary: Make settings persist only on Save and keep last saved values.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 21:12 KST
- Request summary: Hide settings button in mini mode.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 21:18 KST
- Request summary: Remove data/export/import section from settings modal.
- Files touched: src/App.tsx.
- Commands run: none.
- Verification: not run (typescript-language-server not installed).
- Result: success (changes applied).

### 2026-01-29 22:29 KST
- Request summary: Implement fixes for mini-mode sync, tray icon, DnD UX, and persistence; setup test environment.
- Files touched: package.json, vitest.config.ts, vitest.setup.ts, src/utils/time.test.ts, src/utils/sortTasks.test.ts, electron/main.ts, electron/preload.cts, src/types.ts, src/App.tsx, src/hooks/useTaskStore.ts, src/components/TaskItem.tsx, src/components/SortableTaskItem.tsx.
- Commands run: npm install, npm test, npm run typecheck, npm run build.
- Verification: 
  - Vitest passed (2 test files, 5 tests).
  - Typecheck passed.
  - Build passed (dist-electron and dist generated).
- Result: success (changes applied and verified).

### 2026-01-30 04:21 KST
- Request summary: Fix packaged window rendering by using relative Vite asset paths; mitigate Windows electron-builder app.asar lock by using unique output dir per build.
- Files touched: vite.config.ts, package.json, scripts/electron-builder.mjs.
- Commands run: npm test, npm run typecheck, npm run build, npm run dist (x2).
- Verification:
  - Vitest passed (2 test files, 5 tests).
  - Typecheck passed.
  - Build passed.
  - dist/index.html now references ./assets/* (relative, compatible with Electron loadFile/file://).
  - electron-builder succeeded twice, producing build_dist/run-*/ outputs (no app.asar removal lock).
- Result: success.

### 2026-01-30 04:29 KST
- Request summary: Fix deadline add-time chips so repeated presses of the same chip cumulatively add time; rebuild executable.
- Files touched: src/App.tsx.
- Commands run: npm test, npm run typecheck, npm run dist.
- Verification:
  - Vitest passed (2 test files, 5 tests).
  - Typecheck passed.
  - electron-builder completed successfully (output under build_dist/run-20260130-042935).
- Result: success.

### 2026-01-30 04:36 KST
- Request summary: Resume interrupted session; re-verify packaged window + electron-builder lock mitigations; rebuild executable.
- Files touched: none (verification/build only).
- Commands run: npm test, npm run typecheck, npm run build, npm run dist.
- Verification:
  - Vitest passed (2 test files, 5 tests).
  - Typecheck passed.
  - Build passed.
  - electron-builder completed successfully (output under build_dist/run-20260130-043616).
- Result: success.

### 2026-01-30 04:41 KST
- Request summary: Make deadline add-time chips reliably cumulative on repeated/rapid clicks by using functional state update; add unit test; rebuild executable.
- Files touched: src/App.tsx, src/utils/time.ts, src/utils/time.test.ts.
- Commands run: npm test, npm run typecheck, npm run dist.
- Verification:
  - Vitest passed (2 test files, 7 tests).
  - Typecheck passed.
  - electron-builder completed successfully (output under build_dist/run-20260130-044138).
- Result: success.
