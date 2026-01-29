# Draft: Deadline Chip Repeat Press Bug

## Requirements (confirmed)
- Fix UI bug: deadline-add chip buttons (e.g., `+1h`, `+2h`) must be pressable repeatedly; each press cumulatively adds the duration again.
- Minimal bugfix; avoid refactors; follow existing patterns.
- No type suppression.
- After fix: rebuild executable via `npm run dist`.
- Update `CHANGELOG.request.md` per repo rules.

## Repo Observations
- Deadline-add chips exist in the add-task form in `src/App.tsx`.
- Current handler sets deadline relative to *now* (not relative to current deadline value).

## Likely Root Cause(s)
- `setDeadlineByMinutes(minutes)` uses `dayjs().add(minutes, "minute")`, so it does not accumulate; pressing the same chip twice within the same minute can result in the same `YYYY-MM-DDTHH:mm` string.
- React state setter bails out when next state is strictly equal to previous (`string` equality), making repeat presses appear to do nothing.

## Technical Decisions
- Fix by basing increments on the current `deadline` state via functional state update (`setDeadline(prev => ...)`).
- Keep changes minimal and localized (primary change in `src/App.tsx`).
- Add a small unit-tested helper if needed to make behavior testable without adding a React test harness.

## Test Strategy (initial)
- Test infrastructure exists: Vitest (`npm test`).
- Prefer a small unit test that verifies repeated increments are cumulative.

## Open Questions
- None blocking identified.

## Scope Boundaries
- INCLUDE: Add-task deadline chip behavior (repeat presses) and any other identical chip groups found by search.
- EXCLUDE: UI redesign, new components, broader deadline editing refactors.
