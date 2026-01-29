This project is a transparent desktop overlay application built with Electron, React, TypeScript, and Vite. It is designed to manage tasks with a "Glassmorphism" UI that floats on the desktop.

Project Structure
electron/ - Main process code (Window creation, IPC handlers, System tray logic)

main.ts - Entry point for the Electron app

preload.ts - Context bridge exposure for secure IPC communication

src/ - Renderer process (React Application)

components/ - Reusable UI components (TaskItem, CustomTitleBar, etc.)

hooks/ - Custom React hooks (e.g., useTimeCheck, useTaskStore)

utils/ - Helper functions (Date formatting, Sorting logic)

App.tsx - Main layout with drag regions and transparent background

dist/ - Build output (do not edit manually)

Tech Stack & Libraries
Core: Electron, React, TypeScript, Vite

Styling: Tailwind CSS (preferred for all styling), clsx/tailwind-merge for class handling

State Management: React Context or Zustand

Persistence: electron-store (for saving tasks locally)

Utilities: dayjs (date manipulation), dnd-kit (drag & drop interface)

Code Standards
1. Electron & IPC
Security: Never enable nodeIntegration. Always use contextBridge in preload.ts.

Communication: Use ipcRenderer.invoke (Renderer) and ipcMain.handle (Main) for two-way data exchange.

Window Management: The main window must be transparent: true, frame: false, and alwaysOnTop: true.

2. TypeScript & React
Use Strict Mode. Define explicit interfaces for all Props and Data types (e.g., Task, TaskStatus).

Functional Components only.

Use useEffect sparingly; prefer derived state where possible, but use setInterval inside useEffect for the real-time deadline checking feature.

3. Styling (Tailwind CSS)
Use standard Tailwind utility classes.

For the glass effect, use: bg-slate-900/80 backdrop-blur-md.

Drag Region: The custom title bar must have the CSS property -webkit-app-region: drag. Buttons inside it must be no-drag.

Business Logic Rules
Task Urgency System
Tasks must change color based on the remaining time (deadline - now):

> 2 hours: Default (Slate/Gray)

<= 2 hours: Yellow

<= 1 hour: Orange

<= 30 mins: Red

<= 15 mins: Deep Red (Pulse animation)

Expired: Show "Complete/Hold" buttons.

Sorting & Dragging
Default Behavior: Auto-sort by earliest deadline (deadline ASC).

Manual Override: Users can drag & drop tasks (dnd-kit).

Constraint: If a user manually reorders a task, the auto-sort logic should likely be paused or the item should be "pinned" to that position until the next strict refresh.

Data Persistence
All tasks must be saved to the local file system using electron-store immediately upon creation, update, or deletion.

App state (window position/size) should optionally be saved and restored on restart.

Change Logging Rule
When requesting changes from OpenCode, record each request in a local change log entry that includes:
- Date/time (local)
- Request summary (1-2 lines)
- Files touched (list)
- Commands run (if any)
- Verification performed (tests/build/lsp)
- Result (success or failure)
Store these entries in a single running log file (default: CHANGELOG.request.md) at the repo root.
