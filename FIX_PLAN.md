## Fix Plan

### Scope
This plan documents and implements the following improvements:
- Manual drag-and-drop ordering (persisted) with correct DnD wiring
- Task editing (title and deadline)
- System tray controls (show/hide, always-on-top, mode switch, quit)
- True transparent overlay background (glass panel only)
- IPC window state type alignment (null-safe)
- Persistence hydration without redundant writes
- Time tick cadence optimization
- Electron security hardening (sandbox, navigation/window-open guards, CSP)

### Constraints & Rules
- Use Tailwind CSS and the glass effect (`bg-slate-900/80 backdrop-blur-md`).
- Electron IPC must use `ipcRenderer.invoke` / `ipcMain.handle`.
- Record each change request in `CHANGELOG.request.md` with commands and verification.
- No type-safety suppression (`as any`, `@ts-ignore`).

### Dependencies (Order)
1. Data flow correctness: DnD manual ordering, persistence, and sorting
2. UI/UX changes: task edit UI, transparent background adjustments
3. Platform features: tray controls
4. IPC and type alignment
5. Performance + security hardening

### Step-by-Step Tasks
1. DnD manual order
   - Implement `handleDragEnd` to update order with `arrayMove`.
   - Respect `manualOrder` in `orderedTasks` and align `SortableContext.items` with rendered tasks.
   - Persist `order` and `manualOrder` in store and IPC.

2. Task edit capability
   - Add inline edit for title and deadline on each task item.
   - Validate deadline format (ISO) and prevent empty titles.
   - Persist edits via store and IPC.

3. Transparent overlay background
   - Make `body`/root background transparent.
   - Move gradients/atmosphere into the glass panel only.
   - Keep mini-mode lightweight and readable.

4. System tray controls
   - Add tray icon and context menu with: Show/Hide, Always on Top, Toggle Mini/Normal, Quit.
   - Wire to existing IPC where possible; add new handlers if needed.

5. IPC window state type alignment
   - Align `window:get` and `window:get-bounds` return types to `WindowState | null`.
   - Update `shared/types.ts`, `src/types.ts`, and any renderer usage.

6. Persistence hydration
   - Split store hydration from persistence writes (avoid saving on initial load).
   - Add a small debounce if needed for rapid updates.

7. Time tick cadence
   - Adjust `useTimeCheck` interval to 10-60 seconds to reduce re-render load.

8. Security hardening
   - Enable `sandbox: true` if compatible.
   - Block navigation and new windows (setWindowOpenHandler, will-navigate).
   - Add a CSP in `index.html` suitable for Electron.

### Success Criteria
- Manual drag reorders tasks and persists across reloads.
- Editing a task updates title/deadline without data loss.
- Background outside the glass panel is transparent.
- Tray controls work and do not crash on launch/quit.
- IPC typings are consistent and no null/undefined surprises remain.
- No redundant save on initial hydration.
- CPU usage decreases with lower tick cadence.
- Security checks prevent window.open and navigation.

### Test Plan
1. Manual: add tasks, drag reorder, reload app → order persists.
2. Manual: edit title/deadline, reload → changes persist.
3. Manual: verify transparency (desktop visible) in normal + mini mode.
4. Manual: tray menu actions (show/hide, toggle on top, switch mode, quit).
5. Manual: check IPC calls in console (no errors).

### File Touch List (Expected)
- `src/App.tsx`
- `src/components/SortableTaskItem.tsx`
- `src/components/TaskItem.tsx`
- `src/hooks/useTaskStore.ts`
- `src/utils/sortTasks.ts`
- `src/index.css`
- `electron/main.ts`
- `electron/preload.cts`
- `shared/types.ts`
- `src/types.ts`
- `index.html`
- `CHANGELOG.request.md`
