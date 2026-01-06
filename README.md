# Personal Kanban Board (Local-First)

In a world full of JavaScript and CSS frameworks, going back to basics can feel a little painful — but it’s also a great learning experience. This project intentionally sticks to vanilla web fundamentals to help people (re)learn how browsers, DOM events, storage, and simple UI patterns actually work.

At some point I’ll likely add a “same app, but with a framework” variant just for fun — mainly to compare speed, bundle size, and complexity as a learning exercise.

Scope note: this is **not** meant to be a team collaboration tool. It’s a personal board you can use at work *if your company allows it*.

A lightweight, **fully local** personal Kanban board for day-to-day task tracking.

- **No server, no accounts, no build step**: open the page, start moving cards.
- **Local-first**: everything is stored in your browser via `localStorage`.
- **Portable**: export/import your board as a single JSON file for backups.

This is intended for personal use: quick capture, simple workflow columns, and a frictionless “open-and-plan” loop.

## What you get

- Columns (create / rename / delete / reorder)
- Tasks (add / edit / delete / drag between columns)
- Labels (create / edit / delete, multi-label tasks)
- Import/export JSON to move the board between machines or keep backups

## Quick start

The board is a static site (HTML/CSS/JS). The most reliable way to run it is via a tiny local web server.

1. Start a local server from this folder:

   - Python: `python3 -m http.server 8000`
   - Or any static server you like

2. Open: `http://localhost:8000/`

If you *really* want to, you can try opening `index.html` directly in the browser, but some browsers restrict storage behavior for `file://` URLs. A local server avoids that.

## Daily use

- Add a task via the **plus** button in a column header
- Click a task’s text to edit it
- Drag tasks to update status
- Drag the column grip handle to reorder columns

## Data, backups, and portability

All board data lives in your browser’s `localStorage` (on this device, in this browser profile).

- Use **Export** to download a snapshot JSON
- Use **Import** to restore from a snapshot JSON

Tip: if you care about your board history, export regularly (e.g., end of day / end of week) and store the JSON somewhere you back up.

### Storage keys (for troubleshooting)

The app stores data under these `localStorage` keys:

- `kanbanTasks`
- `kanbanColumns`
- `kanbanLabels`

If you ever need a “hard reset”, clear site data for the page in your browser settings, or delete those keys in DevTools.

## Project constraints

- Vanilla HTML/CSS/JS
- Single external dependency: Lucide icons (CDN)
- No backend; no database

## Files

- `index.html`: UI shell and modals
- `design.css`: styling
- `kanban.js`: board logic + localStorage + import/export
