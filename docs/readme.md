# Documentation
Live Demo-Site make it yours: https://mdiener21.github.io/personal-kanban/


Welcome to the Personal Kanban Board documentation. This folder contains detailed guides, templates, and technical specifications for the project.

## Quick Links

| Document | Description |
|----------|-------------|
| [specification-kanban.md](specification-kanban.md) | Technical specification and architecture |
| [help-how-to.md](help-how-to.md) | User guide and in-app help content |
| [boards.md](boards.md) | Board templates and use cases |
| [labels.md](labels.md) | Label taxonomy and organization strategies |
| [kanban-ecosystem.md](kanban-ecosystem.md) | Comparison with other kanban tools |

## Example Boards

The [example-boards/](example-boards/) folder contains ready-to-import JSON templates:

- **Eisenhower-Method-Board.json** — Prioritization using urgent/important quadrants
- **Getting-Things-Done-Template.json** — GTD methodology workflow
- **Personal-Work-Kanban-Template.json** — Standard personal/work board setup

To use a template: click **Import** in the app and select the JSON file.

## For Users

Start with [help-how-to.md](help-how-to.md) for a complete guide on using the app, including:

- Creating and managing boards
- Adding tasks and columns
- Using labels effectively
- Import/Export for backups

For inspiration on how to structure your boards, see:

- [boards.md](boards.md) — Common board layouts (Project Management, Personal, Creative, etc.)
- [labels.md](labels.md) — Suggested label systems for different use cases

## For Developers

The [specification-kanban.md](specification-kanban.md) contains the full technical specification:

- Data models (Board, Task, Column, Label)
- Storage architecture (localStorage, per-board namespacing)
- UI components and behaviors
- Icon system (tree-shaken Lucide icons)
- Event flow and rendering pipeline

Also see the [copilot-instructions.md](../.github/copilot-instructions.md) for coding conventions and architecture guidelines.

## Project Overview

Personal Kanban Board is a **local-first, no-backend** task management app:

- All data stored in browser `localStorage`
- No server, no cloud, no tracking
- Export/Import to JSON files for backup
- Works offline after initial load

For quick start and deployment instructions, see the main [README.md](../README.md).
