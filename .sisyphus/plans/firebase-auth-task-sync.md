# Firebase Auth + Firestore Task Sync (Electron Overlay)

## TL;DR

> Quick Summary: Add optional Google login (system browser OAuth + PKCE + deep link callback) and per-user Cloud Firestore sync for tasks, while preserving the current Electron security posture by keeping all network + token handling in the main process.
>
> Deliverables:
> - Google sign-in + sign-out + account switching UI
> - Per-user task + manual order sync to Cloud Firestore (offline-first via local cache + oplog)
> - Secure token storage (main process only; encrypted refresh tokens)
> - Vitest coverage for merge/sync/auth parsing logic
>
> Estimated Effort: Large
> Parallel Execution: YES (3 waves)
> Critical Path: OAuth plumbing → Firebase session → Firestore REST client → Sync engine → UI wiring

---

## Context

### Original Request
Firebase로 백엔드 연동해서 등록된 일정(현재 앱의 Task)을 DB에 저장하고, Google 로그인으로 어디서 접속하든 저장했던 일정이 동기화되도록 구현.

### Confirmed Requirements
- Data model: keep existing `Task` (no recurrence, no extra fields): `id`, `title`, `deadline` (ISO), `status`, `createdAt`.
- Auth: Google login using system browser OAuth Authorization Code + PKCE.
- OAuth callback: custom deep link URL scheme back into the app.
- DB: Cloud Firestore.
- Offline-first: YES.
- Local cache: keep `electron-store` as per-user cache/backup.
- Login requirement: optional; local-only mode remains; login enables sync.
- Multi-user: support account switching on same machine.
- First login migration: merge local + cloud; cloud wins on same-id conflict.
- Sync scope: tasks only (do not sync app settings).
- Platform: Windows only.
- Tests: include tests (Vitest exists).

### Codebase Baseline (facts)
- Local persistence today: main-process `electron-store` + IPC.
  - `electron/main.ts` stores: `tasks`, `taskOrder`, `manualOrder`, `settings`, `windowState*`, `windowMode`.
  - IPC channels include `tasks:get`, `tasks:set`, `tasks:order:get`, `tasks:order:set`.
  - Preload exposes `window.api.*`: `electron/preload.cts`.
  - Renderer store persists by calling `window.api.saveTasks/saveTaskOrder`: `src/hooks/useTaskStore.ts`.
- Security posture:
  - `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`: `electron/main.ts`.
  - All popups denied and navigation prevented: `electron/main.ts`.
- CSP is restrictive in renderer (important): `index.html` limits `connect-src` to localhost; this will break renderer-based Firebase SDK, so we avoid doing network in renderer.

### Architecture Decision (from Oracle consultation)
Preserve renderer as UI-only.
- Main process owns:
  - OAuth PKCE flow and deep link capture
  - Firebase session via REST (Identity Toolkit + Secure Token)
  - Firestore sync via REST
  - Per-profile local cache and offline oplog
- Renderer only calls narrow IPC methods via preload; renderer never receives tokens.

---

## Work Objectives

### Core Objective
Enable per-user, cross-device task sync backed by Firestore, with secure Google login using system browser OAuth + PKCE, without weakening Electron security settings.

### Concrete Deliverables
- Auth + profile management:
  - Login button, logout, profile switcher
  - Active profile shown in UI (email/displayName)
  - Sync status indicator (idle/syncing/offline/error)
- Cloud sync:
  - Tasks synced to Firestore under per-user path
  - Manual order state synced (default)
  - First-login merge from local profile → cloud/user profile
- Security:
  - Tokens never exposed to renderer
  - Refresh tokens stored encrypted (Electron `safeStorage`)
- Tests:
  - Unit tests for PKCE, callback parsing, merge logic, Firestore value codec
  - CI-style commands: `npm run typecheck`, `npm test`, `npm run build`

### Definition of Done
- `npm run typecheck` exits 0
- `npm test` exits 0
- `npm run build` exits 0
- When logged in as user A and creating/updating tasks, user A sees the same tasks after switching to user A on another machine (verified via mocked Firestore REST in tests; real end-to-end requires Firebase project config).

### Must NOT Have (Guardrails)
- Must NOT weaken Electron security posture:
  - Do not enable `nodeIntegration`
  - Do not disable `contextIsolation`
  - Do not remove `sandbox`
- Must NOT allow arbitrary navigation/popups in the main window.
- Must NOT store OAuth codes/verifiers/access tokens/refresh tokens in plaintext `electron-store`.
- Must NOT pass tokens to the renderer.
- Must NOT broaden CSP in `index.html` to `connect-src *` (ideally keep unchanged).

Important constraint:
- Google OAuth redirect support for *Windows desktop* must be validated early. If Google blocks custom schemes for the chosen OAuth client type, pivot to loopback (`http://127.0.0.1:<port>/callback`) as a fallback.

---

## Verification Strategy

### Test Decision
- Infrastructure exists: YES (Vitest)
- Strategy: Tests-after but in the same tasks (unit tests for headless logic); no manual verification requirements.

### Required Commands
```bash
npm run typecheck
npm test
npm run build
```

### Test Coverage Targets
- Merge logic (first-login migration): local+cloud union, cloud wins on same id
- Conflict rules (ongoing): last-write-wins by updatedAt + tombstone delete
- OAuth:
  - PKCE code challenge generation
  - authorize URL builder includes state+nonce+code_challenge
  - callback URL parser + state validation
- Firestore REST:
  - Task <-> Firestore Value codec roundtrip
  - commit payload structure for upsert/delete/order

Known limitation:
- Real Google login cannot be automated without credentials; plan relies on unit/integration tests with mocked HTTP.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately)
- Task 1: Baseline + configuration scaffolding (no dependencies)
- Task 2: OAuth PKCE + deep link design (no dependencies)
- Task 3: Firestore schema/rules design + value codec spec (no dependencies)

Wave 2 (After Wave 1)
- Task 4: Main-process auth implementation + IPC surface (depends: 2)
- Task 5: Firebase session via REST (depends: 4)
- Task 6: Firestore REST client (depends: 3)

Wave 3 (After Wave 2)
- Task 7: Sync engine + oplog + per-profile cache (depends: 5,6)
- Task 8: Renderer UI wiring + account switching + status UI (depends: 4,7)

---

## TODOs

> Implementation + tests live in the same task.
> Add a request log entry per the repo rule in `CHANGELOG.request.md` for each meaningful user request.

- [ ] 0. Provision Firebase project + Google OAuth client (user-assisted prerequisite)

  What to do:
  - Create a Firebase project (or choose an existing one).
  - Enable:
    - Authentication: Google provider
    - Cloud Firestore (Native mode)
  - Create Google OAuth client for desktop/installed app and ensure PKCE is allowed.
  - Collect the values needed by the app:
    - Firebase Web API key (`FIREBASE_WEB_API_KEY`) (not secret)
    - Firebase project id
    - Google OAuth client id (Desktop)
    - Deep link scheme string

  Notes:
  - This step requires access to your Google/Firebase console (credentials). It cannot be fully automated without those credentials.

  Acceptance Criteria:
  - The four config values are available for wiring into the app.

- [ ] 1. Capture prerequisites + add configuration placeholders

  What to do:
  - Document required external setup and config values (placeholders only; no secrets committed).
  - Add a config loading strategy (env or electron-store) for:
    - Firebase Web API key (`FIREBASE_WEB_API_KEY`)
    - Firestore project id
    - Google OAuth client id (desktop)
    - Deep link scheme (e.g. `todosoverlay`)
  - Add a per-installation stable `deviceId` generator (for conflict debugging) stored locally.

  Must NOT do:
  - Do not commit real credentials.

  Recommended Agent Profile:
  - Category: `unspecified-high`
  - Skills: (none)

  References:
  - `package.json` - scripts + electron-builder config location.
  - `electron/main.ts` - current `electron-store` usage and schema.
  - `shared/types.ts` - current Task model.

  Acceptance Criteria:
  - `npm run typecheck` passes.
  - Unit tests added for config parsing / defaults (Vitest).

- [ ] 2. Define Firestore data model + rules (plan + testable codec spec)

  What to do:
  - Define the Firestore paths:
    - `users/{uid}/tasks/{taskId}`
    - `users/{uid}/meta/order` (manualOrder array + manualOrder flag)
  - Add merge rules:
    - First login: cloud wins on same id
    - Ongoing: last-write-wins by `updatedAt` (client timestamp) + optional `serverUpdatedAt` after push
    - Deletes use tombstone `deletedAt` to prevent resurrection
  - Specify Firestore REST encoding for Task fields (timestamps, strings, enums).
  - Decide defaults:
    - Manual order sync across devices: YES (default; see “Decisions Needed”)

  Recommended Agent Profile:
  - Category: `ultrabrain`
  - Skills: (none)

  References:
  - Firestore docs (structure + rules):
    - https://firebase.google.com/docs/firestore/data-model
    - https://firebase.google.com/docs/firestore/manage-data/structure-data
    - https://firebase.google.com/docs/firestore/security/rules-query
  - `shared/types.ts` - Task fields.
  - `src/utils/sortTasks.ts` - current ordering expectations.

  Acceptance Criteria:
  - A written schema + merge spec exists in the codebase (e.g. markdown doc under `.sisyphus/` or `docs/`).
  - Vitest unit tests exist for the Task <-> Firestore Value codec (roundtrip).

- [ ] 3. OAuth PKCE + deep link callback plumbing (main-process)

  What to do:
  - Validate redirect URI feasibility for the chosen Google OAuth client:
    - Primary: custom scheme (deep link)
    - Fallback: loopback localhost redirect if custom scheme is rejected
  - Implement PKCE (S256) generation and OAuth authorize URL builder.
  - Implement deep link capture on Windows:
    - Acquire single-instance lock.
    - Parse deep link URL from `process.argv` on cold start.
    - Parse deep link URL from `second-instance` event when app is running.
  - Validate `state` + `nonce` + TTL.
  - Expose minimal IPC to renderer:
    - `auth:startLogin` (opens browser)
    - `auth:onLoginResult` event or `auth:getSession` polling

  Must NOT do:
  - Do not open an embedded auth window.
  - Do not allow arbitrary `window.open`.

  Recommended Agent Profile:
  - Category: `unspecified-high`

  References:
  - `electron/main.ts` - BrowserWindow security + place to register protocol/single instance.
  - `electron/preload.cts` - current IPC exposure pattern.
  - Google native OAuth guidance: https://developers.google.com/identity/protocols/oauth2/native-app
  - Electron window open handler docs: https://electronjs.org/docs/latest/api/window-open

  Acceptance Criteria:
  - Vitest tests exist for:
    - PKCE known-vector (or deterministic) test
    - authorize URL contains expected params (`code_challenge`, `state`, scopes)
    - callback parser extracts `code` and rejects mismatched state

- [ ] 3a. (Fallback) Loopback redirect receiver (only if deep link redirect is not supported)

  What to do:
  - Implement a minimal local HTTP server that listens on `127.0.0.1` and receives the OAuth redirect.
  - Keep PKCE + state validation identical to deep link mode.

  Must NOT do:
  - Do not bind to `0.0.0.0`.

  Acceptance Criteria:
  - Vitest tests cover parsing the loopback callback URL.

- [ ] 4. Add Windows protocol registration for deep link scheme

  What to do:
  - Configure electron-builder to register the chosen scheme (e.g. `todosoverlay://`).
  - Ensure dev-mode works (might require manual registry on Windows; document).

  References:
  - `package.json` - `build` section for electron-builder.
  - `electron/main.ts` - startup handling for deep link.

  Acceptance Criteria:
  - Packaged app config contains protocol registration entries.
  - A unit test verifies deep link parsing logic (string in argv → parsed URL).

- [ ] 5. Exchange Google OAuth code → Google tokens (main-process)

  What to do:
  - Implement token exchange against `https://oauth2.googleapis.com/token` using PKCE.
  - Extract `id_token` (and access token if returned).
  - Map and surface errors to renderer (user-cancel, invalid_grant, network).

  Recommended Agent Profile:
  - Category: `unspecified-high`

  References:
  - Google OAuth native doc (token endpoint params): https://developers.google.com/identity/protocols/oauth2/native-app

  Acceptance Criteria:
  - Vitest tests mock `fetch` and cover success + failure branches.

- [ ] 6. Convert Google identity → Firebase session (Identity Toolkit REST)

  What to do:
  - Call Identity Toolkit `accounts:signInWithIdp` using Google `id_token` to obtain Firebase `idToken`, `refreshToken`, `localId`.
  - Store refresh token encrypted with Electron `safeStorage`.
  - Implement refresh using Secure Token API; keep Firebase `idToken` in memory with expiry.
  - Expose renderer-facing IPC:
    - `auth:getActiveProfile`
    - `profiles:list` and `profiles:setActive`
    - `auth:signOut`

  Must NOT do:
  - Must not store tokens in plaintext `electron-store`.

  References:
  - Firebase custom tokens doc (for context; not required): https://firebase.google.com/docs/auth/admin/create-custom-tokens
  - Firebase Google sign-in overview: https://firebase.google.com/docs/auth/web/google-signin
  - `electron/preload.cts` - expose new API surface.
  - `src/types.ts` - extend `IpcApi` contract.

  Acceptance Criteria:
  - Vitest tests mock Identity Toolkit + Secure Token responses.
  - Tokens are never returned via IPC in tests (assert API shapes).

- [ ] 7. Implement Firestore REST client + Task codec

  What to do:
  - Implement:
    - `commit` writes (upsert task, tombstone delete, set order doc)
    - delta pull (query updated tasks since cursor)
  - Implement codec between `Task` (strings) and Firestore types:
    - store deadlines as Firestore timestamp (or keep as string but be consistent)
  - Decide how to represent `updatedAt` without changing UI:
    - store `updatedAt` in Firestore only (not in shared Task type), tracked in metadata map.

  Recommended Agent Profile:
  - Category: `ultrabrain`

  References:
  - Firestore query docs: https://firebase.google.com/docs/firestore/query-data/queries
  - `shared/types.ts` - Task shape.

  Acceptance Criteria:
  - Vitest tests cover codec + payload generation.

- [ ] 8. Sync engine: per-profile cache + oplog + polling pull/push

  What to do:
  - Restructure local storage schema to support profiles:
    - `local` profile for anonymous
    - `uid` profile per Firebase user
  - Maintain an oplog per profile for offline writes.
  - Hook into existing IPC handlers:
    - When renderer calls `tasks:set`, diff old vs new and append oplog ops (upserts/deletes).
    - When renderer calls `tasks:order:set`, append order op.
  - Implement background sync loops (only when authenticated):
    - Push: drain oplog to Firestore commit
    - Pull: poll Firestore deltas and merge into local cache
  - Account switching behavior:
    - Switching changes the active profile and loads its cached tasks immediately
    - Pending writes stay with their profile; do not replay across users
  - First-login migration:
    - Read cloud snapshot
    - Merge from `local` profile into `uid` profile
    - Push local-only tasks to cloud

  Must NOT do:
  - Must not block UI on network.

  References:
  - `electron/main.ts` - existing store schema + task IPC handlers.
  - `src/hooks/useTaskStore.ts` - how often renderer sends saves (whole-array).
  - `src/App.tsx` - hydration and autosave behaviors.

  Acceptance Criteria:
  - Vitest tests cover:
    - First login merge (cloud wins on same id)
    - LWW merge and tombstones
    - Account switch isolation (no cross-profile bleed)

- [ ] 9. Renderer UI: login + profile switch + sync status

  What to do:
  - Add UI components in existing settings area (or header):
    - Login button
    - Profile selector
    - Logout
    - Sync status indicator
  - Ensure current task UX remains unchanged in local mode.
  - On profile change, reload tasks/order via `window.api.getTasks/getTaskOrder` (now profile-aware in main).

  Recommended Agent Profile:
  - Category: `visual-engineering`
  - Skills: `frontend-ui-ux`

  References:
  - `src/App.tsx` - where settings modal and hydration exists.
  - `src/components/CustomTitleBar.tsx` - potential place for status indicator.

  Acceptance Criteria:
  - `npm test` passes.
  - UI shows login state and does not display remote avatars (to avoid CSP changes).

- [ ] 10. Update repo request log

  What to do:
  - Append an entry to `CHANGELOG.request.md` capturing:
    - Date/time
    - Request summary
    - Files touched
    - Commands run
    - Verification performed
    - Result

  References:
  - `AGENTS.md` (repo rule summary)

  Acceptance Criteria:
  - `CHANGELOG.request.md` includes a new entry for this request.

---

## Commit Strategy

- Prefer atomic commits per milestone:
  - `feat(auth): add OAuth PKCE deep link login plumbing`
  - `feat(sync): add Firestore REST client and per-profile sync engine`
  - `feat(ui): add login/profile switcher and sync status`
  - `test(sync): add merge/codec/auth unit coverage`

Each commit must pass:
```bash
npm run typecheck && npm test
```

---

## Defaults Applied (override if needed)
- Manual order sync across devices: YES.
- Sync transport: main-process REST (no Firebase SDK in renderer).
- No Google avatar images shown in UI (avoid CSP expansion).

## Decisions Needed (critical inputs)
- Provide Firebase project identifiers and keys (obtained via Task 0):
  - `FIREBASE_WEB_API_KEY`
  - Firebase project id
  - Google OAuth client id (Desktop / installed app)
  - Deep link scheme string
