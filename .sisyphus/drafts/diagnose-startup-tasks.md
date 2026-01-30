# Draft: Diagnose Startup Tasks Not Loading

## Requirements (confirmed)
- Need a step-by-step plan to diagnose why tasks are not loaded on startup despite logged-in profile.
- Logs show tasks:get returns 0; pullDeltas with cursor 2026-01-30T05:15:38.645Z returns 0 repeatedly.
- Recently added primeProfileFromRemote and blocked tasks:set when profile empty.
- Plan should include verification steps, minimal code changes, parallel tasks, and tools.
- Source of truth: remote-first (overwrite local on startup if profile empty).
- If tasks empty + cursor present: ignore cursor and full prime from remote.
- Verification: manual app checks + log evidence.

## Technical Decisions
- Diagnose-first workflow to isolate profile gating vs delta cursor logic.
- Remote-first startup behavior with cursor override when tasks empty.

## Research Findings
- Pending: codebase exploration and external best practices.

## Open Questions
- How is cursor persisted and advanced in the current code?
- What is the exact startup order for profile hydration vs task sync?

## Scope Boundaries
- INCLUDE: diagnosis steps, minimal fixes, verification.
- EXCLUDE: large refactors or feature additions.
