# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed (unreleased)

### Removed (unreleased)

## [1.0.10] - 2026-02-06

### Changed (1.0.10)

- Refactored monolithic `design.css` (2,285 lines) into a modular CSS architecture under `src/styles/` with 16 focused files organized by concern (tokens, base, layout, utilities, responsive, and 10 component files)
- Manage Labels modal now uses an accordion to group labels; first group expanded by default, others collapsed
- Extracted reusable accordion component (`src/modules/accordion.js`, `src/styles/components/accordion.css`) with generic `createAccordionSection(title, items, expanded, renderItem)` API
- Board-level task search now also matches label group names (e.g., searching "People" shows all tasks with labels in the People group)

## [1.0.9] - 2026-02-06

### Added (1.0.9)

- Label groups: labels can now have an optional group field for organizational grouping (e.g. People, Activities)
- Manage Labels modal displays labels organized by group with uppercase section headers
- Task modal label picker shows labels organized by group
- Label create/edit modal includes a group input with autocomplete suggestions from existing groups
- Label search now matches against group names in both Manage Labels and task label picker

## [1.0.8] - 2026-02-06

### Added (1.0.8)

- Label create/edit modal now shows an editable hex color code field next to the color picker, kept in bidirectional sync
- Hex color input validation prevents saving labels with invalid color codes

## [1.0.7] - 2026-02-01

### Added (1.0.7)

- Label search in task editor now shows a full-width "No label found 'X' - Create label" button when no matches are found, allowing users to quickly create a new label with the search term as the pre-filled name
- Form validation for task title and column name fields: both fields are now required and display a red error state with explanatory message when submitted empty
- Validation module (`src/modules/validation.js`) for reusable form field validation functions

### Changed (1.0.7)

### Removed (1.0.7)

## [1.0.6] - 2026-01-31

### Added (1.0.6)

- Reports dashboard: Cumulative Flow Diagram (CFD) stacked area chart showing task count by column over time.
- Task edit modal now includes a small X close button in the top-right.

### Changed (1.0.6)

- Tasks now track `columnHistory` to support cumulative flow reporting.
- Reports page layout redesigned as a fixed dashboard grid with reports-specific styles (no page scrolling).
- Collapsed columns now display the task count in the header (e.g., "To Do (5)")
- Notifications upcoming window (days) is now configurable per board in Settings (default: 3)
- Theme toggle now shows the sun icon when dark mode is active
- Notification banner on desktop now fills a single row with as many tasks as fit before showing a “more” indicator
- Notification banner now refits its task count when the window is resized
- update bump version automagically

### Removed (1.0.6)

## [1.0.5] - 2026-01-25

### Added (1.0.5)

- Column menu now includes a "Sort" option to sort tasks by due date (earliest first) or priority (high to low)
- Notification banner showing tasks due within 2 days or overdue, positioned below the header
- Notifications modal accessible via bell icon in the board menu, listing all urgent tasks
- Notification badge on bell icon showing count of tasks needing attention
- Notification banner close (X) button to hide the banner
- Notifications modal toggle to show/hide the notification banner

### Changed (1.0.5)

- Age is now shown as an example `1y 6M 40d` not simply only `5d`
- Fix: correct column order calculation when adding a new column so that done remains in last order
- Notification banner layout/scroll behavior refined for desktop and mobile

## [1.0.4] - 2026-01-17

### Added (1.0.4)

- Footer now shows the app version
- Reports dashboard now includes weekly lead time (creation → done) bar chart with a trend line
- Reports dashboard now includes weekly completion KPIs and a completed-per-week sparkline

## [1.0.3] - 2026-01-17

### Added (1.0.3)

- Tasks now track `doneDate` when moved into the Done column

### Changed (1.0.3)

- The Done column is now permanent and cannot be deleted

## [1.0.2] - 2026-01-17

### Added (1.0.2)

- Manage Boards modal now includes an "Add Board" button (opens the Create New Board modal)
- Manage Boards modal now includes an inline export button per board (download icon)
- Manage Boards modal now includes an "Import Board" button
- Reports page (reports.html) with an ECharts calendar heatmap of daily updates for the active board (last 365 days)
- Settings toggles to show/hide task priority and show/hide task due date
- Task modal label picker now includes a + button to open Manage Labels and return to the open task
- Edit Task modal now includes an "Open in full page" button (fullscreen icon)
- Manage Labels modal now includes a search field to filter labels
- Columns can now be collapsed into a ~20px bar via a new toggle button (left of the drag handle)

### Changed (1.0.2)

- Creating a board while the Manage Boards modal is open immediately refreshes the boards list to show the new active board
- Board creation entry point moved from the controls dropdown into Manage Boards
- New tasks are inserted at the top of the column (instead of appended to the bottom)
- Export function now includes the board name and replaces any spaces with _ (underscore)
- Label names are now limited to 40 characters (UI prevents longer input and shows an alert)
- Creating/editing a label now warns on duplicate names (case-insensitive, e.g. "Important" vs "important")

### Removed (1.0.2)

- Page refresh/leave warning (`beforeunload`) prompt
- "New Board" button from the controls dropdown menu

## [1.0.0] - 2026-01-11

First public release. No backend. No tracking. No cloud, fully local in your own browser, no-server-required personal kanban board with localStorage persistence. Backup with a single click Export to JSON.

### Added (1.0.0)

- Settings modal (toggle age/updated timestamp, select locale; included in export/import)

## [0.0.1] - 2026-01-05

### Added (0.0.1)

- v0.1 first commits
- dark and light theme
- AI agent guidance via `.github/copilot-instructions.md`
- Board-level task search filter (matches label name, task title, or description)
- Show/expand all tasks when >12 tasks in a column

### Changed (0.0.1)

- build process to use Vite
- create ECMA Script Modules
- security try check for import and export json configurations and data
- Limit task card description text to ~2 lines (prevents overly tall cards)
- On mobile, keep the task modal label list height-capped with a scrollbar (instead of expanding to full height)
- Board-level task search also matches task priority text (low/medium/high)
- Task model now includes `changeDate`, updated on task save (edit, move)
- Task cards display `changeDate` as localized date+time and computed age (e.g. `0d`, `3d`, `2M`)
- Import/export JSON now includes `boardName` and import applies it to the active board
- Import now creates a new board (no overwrite)
- Default task priority is now `low` (configurable per board in Settings)
