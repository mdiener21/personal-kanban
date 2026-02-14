# Personal Kanban Board Documentation

[![GitHub stars](https://img.shields.io/github/stars/mdiener21/personal-kanban.svg?style=social)](https://github.com/mdiener21/personal-kanban/stargazers)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Now-blue)](https://mdiener21.github.io/personal-kanban/)

> **Your data, your browser, your workflow.** A local-first Kanban board that runs entirely in your browser — no servers, no accounts, no tracking.

**[Try the Live Demo](https://mdiener21.github.io/personal-kanban/)**

---

## What is Personal Kanban Board?

Personal Kanban Board is a browser-based task manager built for speed, privacy, and simplicity. All your data stays in your browser's `localStorage` — nothing leaves your machine unless you choose to export it.

**Key highlights:**

- **No server required** — runs 100% in your browser
- **Offline ready** — works without internet after first load
- **Private by design** — no tracking, no cloud, no accounts
- **Export/Import** — back up and restore your boards as JSON files
- **Customizable** — themes, colors, labels, and configurable settings per board

---

## Get productive in 2 minutes

1. **Pick a starting point**
	- **Import a template board** (recommended), or
	- **Create a new board** and add 3–6 columns.
2. **Add tasks** with the **+** button in a column header.
3. **Move work forward** by drag-and-drop between columns.
4. **Use the right tool for the job**
	- **Columns** = workflow state (To Do → In Progress → Done)
	- **Priority** = urgency (urgent/high/medium/low/none)
	- **Labels** = categories (type/area/context/activity)
	- **Due dates** = deadlines (and notifications)

Tip: Everything is stored locally in your browser (`localStorage`). Export regularly if you care about keeping the data.

## Quick Start with Example Boards

Import a pre-built board to get started immediately:

| Board | Description |
|-------|-------------|
| [Personal Demo](example-boards/Personal_Demo_board.json) | Sample board showing the basics |
| [Project Management](example-boards/Project-Management-Board-Template.json) | Backlog → To Do → In Progress → Review → Done |
| [Personal Life](example-boards/Personal-Life-Board-Template.json) | A simple home/personal workflow |
| [Sales Pipeline](example-boards/Sales_board_template.json) | Lead stages + activity labels |
| [Getting Things Done](example-boards/Getting-Things-Done-Template.json) | GTD productivity system |
| [Eisenhower Method](example-boards/Eisenhower-Method-Board.json) | Urgent/Important prioritization |

**How to import:** Click **Import** in the app menu and select a JSON file.

Import creates a **new board** from the JSON and switches to it (your existing boards are not overwritten).

Want more templates? See [boards.md](boards.md).

---

## Documentation

| Document | What you'll find |
|----------|-----------------|
| [User Guide (In-App Help)](help-how-to.md) | The canonical help text shown inside the app |
| [Board Templates](boards.md) | Templates you can import + best practices for columns and workflows |
| [Labels Guide](labels.md) | How to use labels and groups for filtering and categorization |
| [Technical Specification](specification-kanban.md) | Data models, architecture, storage, rendering, and testing details |
| [Kanban Ecosystem](kanban-ecosystem.md) | Comparison with other open-source kanban tools |

---

## 👤 For Users

New to Kanban? Here's where to start:

1. **[User Guide (In-App Help)](help-how-to.md)** — Learn the UI quickly: boards, tasks, columns, labels, import/export
2. **[Board Templates](boards.md)** — Pick a workflow and import a ready-to-use board
3. **[Labels Guide](labels.md)** — Build a label system that helps you filter without turning labels into “status”

---

## 🛠️ For Developers

Want to build on or contribute to the project?

- **[Technical Specification](specification-kanban.md)** — Complete reference for data models (Board, Task, Column, Label), localStorage architecture, UI components, rendering pipeline, and test coverage
- **[CLAUDE.md](../CLAUDE.md)** — Coding conventions and architecture guidelines
- **[Main README](../README.md)** — Setup, build commands, and deployment

The app is built with **Vite**, uses **vanilla JavaScript/CSS/HTML**, and follows local-first principles. Dependencies are limited to Lucide icons, SortableJS, and ECharts (reports only).

---

## Core Features at a Glance

### Boards
Multiple boards with independent columns, tasks, labels, and settings. Switch between contexts instantly.

### Tasks
Create tasks with titles, descriptions, priorities, due dates, and labels. Drag and drop to move between columns. Due dates include a countdown timer with configurable color-coded urgency indicators.

### Columns
Customizable columns with colors, drag-to-reorder, collapse/expand, and sorting by due date or priority.

### Labels & Groups
Color-coded labels organized into groups. Assign multiple labels per task. Search and filter across your board.

### Notifications
Banner and modal alerts for tasks approaching their due date. Configurable threshold for how far ahead to warn.

- Per-board customization: Different boards can have different thresholds
- Flexible workflows: Adjust to your team's or personal preferences
- Better prioritization: Set thresholds that match your actual deadlines
- Real-time updates: Changes apply immediately to all tasks

For example, you could set:

- Sprint planning board: urgent=2 days, warning=5 days (shorter cycles)
- Long-term projects: urgent=7 days, warning=30 days (longer horizons)
- Personal tasks: urgent=3 days, warning=10 days (default)

### Reports & Calendar
Dedicated pages for activity heatmaps, lead time charts, cumulative flow diagrams, and a monthly due-date calendar.

### Settings
Per-board configuration: toggle visibility of priority, due date, age, and timestamps. Set countdown thresholds, locale, and default priority.

---

**Loved the app? [Star the repo on GitHub](https://github.com/mdiener21/personal-kanban) to support the project!** Contributions welcome — fork, improve, and share your ideas.
