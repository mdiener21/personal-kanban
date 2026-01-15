# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (Unreleased)

- Manage Boards modal now includes an "Add Board" button (opens the Create New Board modal)
- Settings toggles to show/hide task priority and show/hide task due date
- Task modal label picker now includes a + button to open Manage Labels and return to the open task

### Changed (Unreleased)

- Creating a board while the Manage Boards modal is open immediately refreshes the boards list to show the new active board
- Board creation entry point moved from the controls dropdown into Manage Boards
- New tasks are inserted at the top of the column (instead of appended to the bottom)
- Export function now includes the board name and replaces any spaces with _ (underscore)
- Label names are now limited to 40 characters (UI prevents longer input and shows an alert)

### Removed (Unreleased)

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



