# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local-first personal kanban board with no backend. All state lives in browser localStorage. Built with vanilla JavaScript, HTML, and CSS using Vite for bundling.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Specification

The specification files include core data structures and details to be maintained at all times.
- `docs/specification-kanban.md` - Detailed description of the kanban board functionality, features, models, to be always updated after making changes to any functionality.

## Architecture

### Entry Points
- `src/kanban.js` - Main entry, wires UI handlers and calls `renderBoard()`
- `src/index.html` - Main board UI
- `src/reports.html` - Separate reports page with ECharts visualizations

### Module Structure (src/modules/)
- **render.js** - Centralized rendering via `renderBoard()`. After any data change, call this to refresh UI.
- **storage.js** - Multi-board localStorage persistence. Keys: `kanbanBoards`, `kanbanActiveBoardId`, `kanbanBoard:<boardId>:columns|tasks|labels|settings`
- **icons.js** - Lucide icons tree-shaking. To add an icon: import from `lucide`, add to `icons` object, call `renderIcons()` after dynamic DOM changes.
- **dragdrop.js** - SortableJS-based drag/drop for tasks and columns
- **accordion.js** - Reusable collapsible accordion. `createAccordionSection(title, items, expanded, renderItem)` builds a section with chevron toggle, count badge, and a body populated via the `renderItem` callback.
- **modals.js** - Modal UX (close via Escape/backdrop). Uses DOM ids from index.html.
- **dialog.js** - `confirmDialog()` / `alertDialog()` instead of `window.confirm`
- **importexport.js** - Per-board JSON export/import. Must update if data shapes change.

### Data Flow Pattern
```
load → modify → save → renderBoard()
```

Many modules use `await import('./render.js')` to call `renderBoard()` and avoid circular imports.

### Domain Objects

**Task**: `id`, `title`, `description`, `priority` (low|medium|high), `dueDate` (YYYY-MM-DD), `column`, `order`, `labels[]`, `creationDate`, `changeDate`, `doneDate`

**Column**: `id`, `name`, `color` (hex), `order`, `collapsed`

**Label**: `id`, `name` (max 40 chars), `color` (hex)

## Key Conventions

- **Technology constraints**: Vanilla JS/CSS/HTML only. No frameworks. Dependencies limited to Lucide, SortableJS, ECharts.
- **Mobile-first**: All interactions must work on small screens.
- **Specification doc**: `docs/specification-kanban.md` - keep updated when features change.
- **Changelog**: `CHANGELOG.md` - update [Unreleased] section following Keep a Changelog format.
- **Theme**: Light/dark via `document.documentElement.dataset.theme`. Persistence key: `kanban-theme`.
- **Done column**: Column with id `done` is permanent and cannot be deleted.
- **New tasks**: Inserted at top of column (order 1).
- **New columns**: Inserted before the Done column.

## Vite Configuration

- Root: `src/`
- Output: `dist/`
- Base path: `./` (relative, for static hosting)
- Two entry points: index.html and reports.html