# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- v0.1 first commits
- dark and light theme
- AI agent guidance via `.github/copilot-instructions.md`
- Board-level task search filter (matches label name, task title, or description)
- Settings modal (toggle age/updated timestamp, select locale; included in export/import)

### Changed

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
