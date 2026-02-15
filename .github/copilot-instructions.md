# Copilot instructions (personal-kanban)

## Big picture
- This is a **local-first, no-backend** kanban app: all state lives in **browser `localStorage`** and the UI is plain DOM.
- Build tooling is **Vite** with **`src/` as the Vite root** and output to `dist/`.
  - Edit source files in `src/` (do **not** hand-edit `dist/`).
- Specification is in `docs/specification-kanban.md` (**always keep it updated** as features change).
- Changelog is in `CHANGELOG.md` (**always update** the **[Unreleased]** section following **Keep a Changelog** whenever behavior/UI/data changes).

## Dev workflows
- Dev server: `npm run dev` (Vite opens `http://localhost:3000`).
- Production build: `npm run build` (writes `dist/`).
- Preview build: `npm run preview`.
- When deploying under a sub-path, adjust `base` in `vite.config.js`.

## Architecture / data flow
- Entry point is `src/kanban.js`: wires UI handlers (boards, modals, import/export, theme) then calls `renderBoard()`.
- Rendering is centralized in `src/modules/render.js`:
  - `renderBoard()` clears `#board-container`, re-creates columns/tasks, then re-attaches drag/drop listeners.
  - After creating/changing elements that use Lucide icons (`span[data-lucide]`), call `renderIcons()` from `src/modules/icons.js`.
- **Icons**: Lucide icons are tree-shaken via `src/modules/icons.js`. To add a new icon:
  1. Import it from `lucide` in `icons.js`
  2. Add it to the `icons` object with its kebab-case name (e.g., `'arrow-right': ArrowRight`)
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

## E2E Testing (Playwright)
- **Responsive controls menu**: `#board-controls-menu` hides toolbar buttons on small viewports; toggled by `#desktop-menu-btn`.
  - If `#settings-btn`, `#manage-boards-btn`, `#manage-labels-btn`, or `#add-column-btn` times out, open the menu first.
  - Pattern: check if button visible → if not, click menu button → wait for button → click button.
- **Modal close assertions**: use `toBeHidden()` instead of `toHaveClass(/hidden/)` for reliable modal close checks.
- **Accordion lists (labels)**: labels render in collapsible accordion sections. If asserting label visibility, expand the relevant accordion header first.
- **Settings persistence**: settings inputs use `change` events. For reliable updates, dispatch `change` or close/reopen modal.
- **Select inputs**: avoid `selectOption({ label: /regex/ })`. Use concrete strings or select by value after reading options.
- **Add task**: use `.add-task-btn-icon` selector in column headers, not `[data-action="add-task"]`.

## Release Process

When asked to create a release/tag for unreleased changes:

1. **Determine next version** — read `package.json` `"version"`, bump patch (e.g. 1.0.10 → 1.0.11). Ask only if minor/major bump seems warranted.
2. **Verify unreleased entries** — read `CHANGELOG.md` top, confirm entries exist under Unreleased sections.
3. **Update `package.json`** — bump `"version"`.
4. **Update `CHANGELOG.md`** — move Unreleased entries into a new `## [X.Y.Z] - YYYY-MM-DD` section. Rename headers from `(unreleased)` to `(X.Y.Z)`. Keep empty Unreleased placeholders at top.
5. **Build** — `npm run build` must succeed.
6. **Commit** — `git add package.json CHANGELOG.md && git commit -m "Bump version to vX.Y.Z and update changelog"` (include Co-Authored-By).
7. **Tag** — `git tag -a vX.Y.Z -m "vX.Y.Z – short summary"`.
8. **Verify** — `git log --oneline -3 && git tag -l --sort=-v:refname | head -3`.
9. **Push tag (only if explicitly asked)** — `git push origin vX.Y.Z` (example: `git push origin v1.0.12`).
10. **Do NOT push** branches/commits unless explicitly asked.

### Release conventions

- **Version source of truth**: `package.json` → Vite injects as `__APP_VERSION__` → footer displays it
- **Changelog format**: Keep a Changelog. Sections: `### Added/Changed/Removed (version)`
- **Commit message**: `Bump version to vX.Y.Z and update changelog`
- **Tag**: Annotated `vX.Y.Z` with brief comma-separated summary
- **Docs to update on feature changes**: `CHANGELOG.md`, `docs/specification-kanban.md`, `CLAUDE.md`, `.github/copilot-instructions.md` (if module structure changes)

