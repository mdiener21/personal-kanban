# Copilot instructions (personal-kanban)

## Big picture
- This is a **local-first, no-backend** kanban app: all state lives in **browser `localStorage`** and the UI is plain DOM.
- Build tooling is **Vite** with **`src/` as the Vite root** and output to `dist/`.
  - Edit source files in `src/` (do **not** hand-edit `dist/`).
- Specification is in `docs/specification-kanban.md` (keep it updated as features change).

## Dev workflows
- Dev server: `npm run dev` (Vite opens `http://localhost:3000`).
- Production build: `npm run build` (writes `dist/`).
- Preview build: `npm run preview`.
- When deploying under a sub-path, adjust `base` in `vite.config.js`.

## Architecture / data flow
- Entry point is `src/kanban.js`: wires UI handlers (boards, modals, import/export, theme) then calls `renderBoard()`.
- Rendering is centralized in `src/modules/render.js`:
  - `renderBoard()` clears `#board-container`, re-creates columns/tasks, then re-attaches drag/drop listeners.
  - After creating/changing elements that use Lucide icons (`span[data-lucide]`), call `window.lucide.createIcons()` **guarded** (see `renderBoard()` and `theme.js`).
- Mutations generally follow: **load → modify → save → `renderBoard()`**.
  - Many modules call `renderBoard()` via `await import('./render.js')` to avoid tight coupling/circular imports (see `dragdrop.js`, `modals.js`, `importexport.js`). Prefer that pattern when adding callbacks inside those modules.
- Import/Export is **per-board scoped** (see `src/kanban.js` + `src/modules/importexport.js`).
  - Export saves the **active board** only.
  - Import creates a **new board** from the JSON and switches to it.
  - If you change any persisted shape (board/tasks/columns/labels), you MUST update `importexport.js` normalization/back-compat so exports still round-trip and imports still accept legacy fields.


## Persistence model (critical)
- Multi-board storage is in `src/modules/storage.js`.
  - Boards list key: `kanbanBoards`; active board key: `kanbanActiveBoardId`.
  - Per-board keys are `kanbanBoard:${boardId}:columns|tasks|labels|settings`.
  - Always go through `ensureBoardsInitialized()` / `loadColumns()` / `loadTasks()` / `loadLabels()` rather than reading localStorage directly.
  - Legacy migration exists for single-board keys (`kanbanColumns`, `kanbanTasks`, `kanbanLabels`). Keep backward-compat fields like `task.text` and `task['due-date']` supported where relevant.

## Domain objects (what code expects)
- Task shape (see `src/modules/tasks.js` + `importexport.js`):
  - `id`, `title` (legacy: `text`), `description`, `priority` (`low|medium|high`), `dueDate` (`YYYY-MM-DD`), `column`, optional `order`, `labels: string[]`, optional `creationDate`.
- Column shape (see `src/modules/columns.js`): `id`, `name`, `color` (hex), optional `order`.
- Label shape (see `src/modules/labels.js`): `id`, `name`, `color` (hex).

## UI conventions
- Mobile first design: the board interactions must all be mobile friendly drag and drop moves and design is for small screens first.
- Modal UX is centralized in `src/modules/modals.js`:
  - Uses modal DOM ids from `src/index.html` and closes via **Escape** and backdrop clicks.
  - Use `confirmDialog()` / `alertDialog()` from `src/modules/dialog.js` for confirmations instead of `window.confirm`.
- Drag/drop is in `src/modules/dragdrop.js`:
  - Task reordering updates `task.order` via DOM order (`updateTaskPositions()` in `tasks.js`).
  - Column reordering updates `column.order` from DOM order (`updateColumnPositions()` in `columns.js`).

## Style system
- Styling is custom CSS variables and components in `src/design.css` (light/dark via `document.documentElement.dataset.theme`).
  - Theme persistence key: `kanban-theme` (see `src/modules/theme.js`).
