# Personal Kanban Board - Technical Specification

## Technology Rules and Principles

- Only vanilla CSS, JavaScript, and HTML
- Minimal dependencies:
  - **Lucide icons**: Tree-shaken ES module import (not CDN) via `src/modules/icons.js`
  - **SortableJS**: Drag-and-drop library for tasks and columns
  - **Apache ECharts (Reports only)**: Modular import via `echarts/core` + explicit `echarts.use()` registration in `src/modules/reports.js`
- Storage: browser localStorage only
- Data persistence: JSON import/export to local disk
- No server, no frameworks
- Build tooling: Vite (ES modules)
  - Reports bundling: Rollup chunk splitting keeps ECharts and ZRender in dedicated vendor chunks (`vendor-echarts`, `vendor-zrender`) to avoid oversized entry chunks.

## AI LLM Rules

- Always update the specification upon completing new tasks to keep the specification up to date.
- Always follow the Technology Rules and Principles section in the document

## Core Data Structures

### Board Model

```javascript
{
  id: "board-uuid",
  name: "Board Name",
  createdAt: "YYYY-MM-DDTHH:MM:SSZ"
}
```

### Task Model

```javascript
{
  id: "uuid",
  title: "task title",
  description: "optional longer description",
  priority: "urgent" | "high" | "medium" | "low" | "none",
  dueDate: "YYYY-MM-DD" | "",
  column: "column-id",
  order: number,
  labels: ["label-id-1", "label-id-2"],
  creationDate: "YYYY-MM-DDTHH:MM:SSZ",
  changeDate: "YYYY-MM-DDTHH:MM:SSZ", // updated on task save (create, edit, change column)
  doneDate: "YYYY-MM-DDTHH:MM:SSZ", // set only when task enters the Done column; removed when leaving Done
  columnHistory: [
    { column: "column-id", at: "YYYY-MM-DDTHH:MM:SSZ" }
  ] // appended when tasks move columns; used for cumulative flow reports
}
```

### Column Model

```javascript
{
  id: "column-id",
  name: "Column Name",
  color: "#hexcolor",
  collapsed: boolean, // optional, defaults false
  order: number
}
```

### Label Model

```javascript
{
  id: "label-id",
  name: "Label Name", // max 40 characters
  color: "#hexcolor",
  group: "Group Name" // optional, defaults to "" (no group)
}
```

## Storage

- **Boards registry**:
  - `kanbanBoards`: array of Board metadata
  - `kanbanActiveBoardId`: last active board id (restored on page load)
- **Per-board data (namespaced)**:
  - `kanbanBoard:<boardId>:tasks`
  - `kanbanBoard:<boardId>:columns`
  - `kanbanBoard:<boardId>:labels`
  - `kanbanBoard:<boardId>:settings`
- Legacy storage (`kanbanTasks`, `kanbanColumns`, `kanbanLabels`) is migrated into a default board on first run.
- All CRUD operations load/save against the currently active board.
- Export/Import operates on the active board.

## UI Components

### Board Layout

- Horizontal flexbox container with columns (scrollable horizontally on mobile)
- Each column: header (drag handle, title, task counter, actions) + task list + optional show-all button
- Task counter: circular blue badge showing task count, updates on any task add/remove/move

### Column Features

- **Create**: Modal form with column name (required) input + color picker
  - If submitted without a name, the name field displays a red error border, red label, and "Column name is required" message below the field
  - Error state is cleared when the modal is reopened
- **New column placement**: Newly created column are inserted to the far right of the board but before column `done` (order `-1`).
- **Edit**: Open column menu (ellipsis) → pencil, edit name + color in modal
- **Delete**: Open column menu (ellipsis) → trash, confirm if tasks exist
- **Sort**: Open column menu (ellipsis) → Sort → choose "By Due Date" or "By Priority"
  - By Due Date: sorts tasks ascending (earliest due date first); tasks without due dates appear at the end
  - By Priority: sorts tasks descending (high → medium → low)
  - Sorting permanently reorders tasks (updates the `order` property)
- **Permanent Done column**: The column with id `done` cannot be deleted.
- **Reorder**: Drag via grip icon handle, updates order property
- **Collapse**: Toggle button (left of the grip handle) collapses a column into a ~20px vertical bar; state is stored per column. When collapsed, the column header displays the task count in the format "ColumnName (count)".
- **Actions**: Plus icon (add task), pencil (edit), trash (delete)

#### Column Header Actions

- Plus icon: adds a task to this column
- Ellipsis icon: opens a small menu with Edit (pencil), Sort (arrow-up-down with submenu), and Delete (trash)

#### Column Color

- Each column has a user-selected hex `color`.
- Column UI uses this color as its accent.
- Tasks inside the column inherit the column accent color for consistent styling.

### Task Features

- **Create**: Click plus icon in column header, modal with Title (required), Description, Priority (urgent/high/medium/low/none), Due Date, column select, label checkboxes
  - If submitted without a title, the title field displays a red error border, red label, and "Task title is required" message below the field
  - Error state is cleared when the modal is reopened or when a valid title is entered
- **New task placement**: Newly created tasks are inserted at the top of the selected column (order `1`).
- **Edit**: Click task title/description, modal pre-filled with current data
- **Edit (full page)**: In the Edit Task modal, an "Open in full page" button (fullscreen icon) expands the modal to full-screen size on larger screens
- **Edit (close)**: The Edit Task modal includes a small **×** button in the top-right that closes the modal (same behavior as Cancel)
- **Delete**: Click X button, confirm deletion
- **Move**: Drag between columns, auto-saves new column and order
- **Display**:
  - Title (clickable, clamped to 1 line)
  - Header row: title left-aligned; priority badge + delete button right-aligned
  - Optional description (clamped to ~2 lines)
  - Labels (colored badges)
  - Footer: optional updated timestamp; bottom row shows due date + age in the same row (depending on Settings)
- **Footer**: Can show `changeDate` ("Updated …") and task age ("Age …") depending on Settings toggles.
  - `changeDate` is displayed using the user-selected locale (via `toLocaleString(locale)`)
  - Age is based on `creationDate` and displayed as `1y 6M 40d` for larger than 1 year,  `0d` for < 1 day, `Nd` for days, and `NM` for months (30 days per month, floor)
    - Years shown only if age ≥ 1 year
    - Months shown only if age ≥ 1 month
    - Days always shown
- **Label selection UX (modal)**:
  - Selected labels are shown as a single horizontal row of colored label pills
  - Each selected label pill has a small **×** button to remove it from the task
  - Label list supports a compact **search/filter** field to quickly find labels
  - The label search field includes a small **+** icon button that opens the **Add Label** modal directly so users can create a new label without leaving task editing; the task modal remains open behind it and preserves in-progress edits
  - When a search returns no matching labels, a full-width button is displayed with the text: `No label found "[search term]" - Create label` which opens the label creation modal with the search term pre-filled in the name field, allowing users to create and customize the new label
- **Task Limit**: If >12 tasks in column, show scrollbar (max-height 600px). "Show all tasks (N)" button expands to 80vh with scrollbar

### Labels

- **Manage**: Dedicated modal listing all labels with color swatch, name, edit/delete buttons
  - Includes a search field to filter labels by name or group (case-insensitive substring match)
  - Labels are organized by group in collapsible accordion sections: each group (plus "Ungrouped" for labels without a group) has a clickable header with a chevron icon and label count badge
  - First section is expanded by default, remaining sections are collapsed
  - Multi-expand: each section toggles independently
- **Create/Edit**: Modal with name input, group input (with datalist autocomplete of existing groups), color picker, and editable hex color code field
  - The hex color field displays the current color as a `#rrggbb` value and updates the color picker in real time when edited
  - Invalid hex values show a red error border; form submission is blocked with an alert until corrected
  - The color picker and hex field stay in sync bidirectionally
- **Groups**: Labels can optionally belong to a group (a simple string property, not a separate entity)
  - Default is no group (empty string)
  - Groups are shown as collapsible accordion sections in the Manage Labels modal and as flat section headers in the task modal label picker
  - Task cards do NOT display group names — only the label name and color are shown
- **Delete**: Removes from all tasks, confirms deletion
- **Assign**: Checkboxes in task modal, multiple labels per task, organized by group
- **Display**: Colored badges with label names on tasks (group not shown)

### Controls Bar

- Toolbar includes a **board-level task search** input (with a search icon) placed beside the brand area.
  - Filtering is **in-memory** (no persistence) and applies to the currently rendered board.
  - A task matches if the search string appears in **task title**, **task description**, **task priority** (low/medium/high), the **label name**, or the **label group name** of any label assigned to the task (case-insensitive substring match).

- Single menu button (ellipsis) that opens a dropdown containing:
  - Board selector dropdown (shows all boards)
  - Manage Boards button (opens boards management modal)
  - Help button (opens help modal)
  - Manage Labels button
  - Settings button (opens Settings modal)
  - Notifications button (opens notifications modal, shows badge with count)
  - Add Column button
  - Export button (downloads JSON)
  - Import button (file picker for JSON)

### Settings

- Settings are **per active board** and stored in localStorage (`kanbanBoard:<boardId>:settings`).
- Settings modal allows:
  - Toggle to show/hide task priority
  - Toggle to show/hide task due date
  - Number input to set the notifications upcoming window (days)
  - Toggle to show/hide task age
  - Toggle to show/hide task updated date/time (`changeDate`)
  - Locale dropdown for formatting the updated timestamp
  - Default task priority dropdown (urgent/high/medium/low/none) used when creating new tasks
- Default locale is initialized from the browser (e.g. `navigator.language`).
- Default priority is `none`.

### Branding

- Brand text displays the active board name (no static title text).

### Reports

- Separate page: `reports.html`
- Shows an Apache ECharts calendar heatmap for the **active board** covering the last 365 days.
- Each day’s value is the count of tasks whose `changeDate` falls on that date (YYYY-MM-DD).
- Reports page uses an **independent, reports-only layout** (does not reuse the main board toolbar/column styling).
- Reports dashboard is designed as a **fixed viewport grid** so sections are visible without page scrolling.

#### Lead Time & Completion

- Reports dashboard also shows **weekly lead time** for completed tasks (creation → done):
  - Uses `creationDate` and `doneDate` on tasks.
  - Lead time is grouped by week (Monday-start), displayed as a **bar chart** of **average lead time (days)**.
  - Includes a **trend line** (4-week moving average).
- Reports dashboard also shows a **weekly completion summary**:
  - KPI tiles for "Completed this week", "Completed last week", and "Avg lead time (last 12 weeks)".
  - A small sparkline chart of tasks completed per week (last 12 weeks).

#### Cumulative Flow Diagram (WIP)

- Reports dashboard includes a **Cumulative Flow Diagram** (stacked area chart):
  - X-axis: time (daily buckets)
  - Y-axis: task count
  - Series are **colored by column** and **ordered by workflow** (based on `column.order`, with Done last).
  - Uses `task.columnHistory` to determine which column each task was in on each day.
  - Legacy tasks without history are seeded with a single entry at the earliest known timestamp (creation/change date) using the task’s current column.

### Notification System

The notification system alerts users to tasks with approaching or past due dates.

#### Notification Banner

- Positioned below the header, spanning across all columns
- Shows when any task has a due date within the configured upcoming window (default 3 days) or is overdue
- Displays: task title and due date status (overdue/due today/due tomorrow/due in N days)
- Clicking a notification opens the task edit modal
- Shows up to 5 tasks with a "more" link to the full modal
- Shows up to 5 tasks with a "more" link to the full modal
- Includes a close (X) button to hide the banner
- Banner visibility is user-controlled and persisted in localStorage
- Excludes tasks in the 'done' column
- Banner is hidden when there are no qualifying tasks

#### Notifications Modal

- Accessed via the bell icon in the board controls menu
- Bell icon shows a badge with the count of qualifying tasks
- Lists all tasks with due dates within the configured upcoming window (default 3 days) or overdue
- Includes a toggle to show/hide the notification banner
- Each notification shows: task title, due date status, priority
- Clicking a notification opens the task edit modal
- Sorted by urgency (most overdue first)

### Icons

- Lucide icons are tree-shaken via `src/modules/icons.js` to minimize bundle size.
- Only icons used in the app are imported and registered.
- Icons used: `SquareKanban`, `Search`, `Plus`, `Fullscreen`, `Settings`, `Columns3`, `Tag`, `SlidersHorizontal`, `Download`, `Upload`, `Moon`, `Sun`, `HelpCircle`, `EllipsisVertical`, `Trash2`, `GripVertical`, `Pencil`, `Kanban`, `ArrowUpDown`, `ChevronRight`, `Bell`, `BellRing`
- To add a new icon:
  1. Import it from `lucide` in `icons.js`
  2. Add it to the `icons` object (PascalCase key)
- Call `renderIcons()` after dynamically adding elements with `data-lucide` attributes.

## Key Behaviors

### Drag and Drop

- **Tasks**: Draggable within and between columns, placeholder shows drop location
- **Columns**: Draggable via grip handle only, placeholder shows drop position
- **Order Tracking**: Both tasks and columns have order property (1-based), updated on drop
- **Performance Optimization**: Task drops use incremental updates instead of full board re-render:
  - `updateTaskPositionsFromDrop()` updates only the moved task and recomputes order for affected columns
  - Only updates `columnHistory` and timestamps when task changes columns (not for reorders within same column)
  - Syncs task counters and collapsed column titles without rebuilding the entire DOM
  - Notifications refresh only when tasks move between columns
- **Auto-save**: On drop, recalculates positions for affected columns and saves to localStorage

### Rendering

- **Main render**: `renderBoard()` clears and rebuilds the board container
- **Done Column Virtualization**: Performance optimization for large Done columns (300+ tasks):
  - Initially renders 50 tasks; subsequent batches load 50 more via "Show more" button
  - Virtualization applies only to Done column when task count exceeds initial batch size
  - Newly dropped tasks into Done remain visible in the rendered slice
- **Label Loading Optimization**: Pre-loads labels into a Map once per render, passed to all `createTaskElement()` calls to avoid repeated `loadLabels()` calls
- `renderBoard()` clears container, recreates all columns/tasks from localStorage
- Sorts columns by order property
- Sorts tasks within each column by order property
- Called after every data modification
- Reinitializes Lucide icons via `renderIcons()` after render

### Modals

- **Scrolling & actions**: If a modal’s content is taller than the viewport, the modal shows a vertical scrollbar while keeping the action row (e.g. Cancel/Save/Close) sticky at the bottom so it is always visible.
- **Mobile Behavior**: Modals are full-screen on mobile. Task editor label list is height-capped with a scrollbar.
- Task modal (add/edit)
- Column modal (add/edit)
- Labels management modal
- Boards management modal
- Board create modal
- Board rename modal
- Label add/edit modal
- Settings modal
- Help modal
- Confirm/Alert dialog modal
- Close on Escape key or backdrop click

### Boards

- **Select active board**: via the board dropdown; selection persists and is restored on next page load.
- **Create board**: via Manage Boards modal → "Add Board" button → opens a modal form with board name input. New boards start with default columns + labels, and empty tasks.
- **Manage boards**: via Manage Boards modal:
  - List boards
  - Open a board (sets active and renders)
  - Export a board (download icon → exports that board to JSON)
  - Import a board (Import Board button → file picker; creates a new board and switches to it)
  - Rename a board (pencil icon → rename modal)
  - Delete a board (trash icon, always confirms: "Do you really want to delete…?")
  - Add a board ("Add Board" button → opens the Create New Board modal)
  - The last remaining board cannot be deleted
- **Mobile UX**:
  - Board selector is full-width with a larger tap target.
  - The controls dropdown does not auto-close when interacting with the selector.

#### Task Modal Details

- **Fields** include:
  - Title (required)
  - Description (optional, textarea with vertical resize capability)
  - Priority (low/medium/high)
  - Due Date (optional, YYYY-MM-DD)
  - Column selection
  - Labels selection

- **Labels section** includes:
  - Active labels row (single line, left-to-right)
  - Remove label via **×** on the label pill
  - Search input to filter the available labels list
  - Checkbox list for assigning/unassigning labels

### Task Counter

- Displayed in column header as circular badge
- Updated every time `renderBoard()` is called
- Shows total tasks in column
- Used in "Show all tasks (N)" button text

### Scrolling

- **Desktop**: Default max-height 600px per column task list. Expanded state: max-height 80vh.
- **Mobile**: Columns have fixed height based on viewport with internal vertical scrolling. Board scrolls horizontally with snap-to-column.
- Styled scrollbar: 8px width, blue thumb

### Warnings

- **beforeunload**: Warns user data is in localStorage, should export before closing
- **Delete task**: Confirmation dialog
- **Delete column**: Warning if tasks exist, confirmation required
- **Delete label**: Confirmation with warning it removes from all tasks

## Default Data

- **Columns**: "To Do", "In Progress", "Done"
- **Labels**: "Urgent" (red), "Feature" (blue), "Task" (orange)
- **Tasks**: 6 sample tasks with various labels

## Technology Constraints

- Pure JavaScript (no frameworks)
- Vite build/dev tooling (ES modules)
- Lucide icons: tree-shaken npm package (`lucide`), icons registered in `src/modules/icons.js`
- SortableJS: npm package (`sortablejs`) for drag-and-drop
- localStorage only (no server, no database)
- Two HTML entry points (`index.html`, `reports.html`) + modular CSS (`styles/index.css`) + JS modules

## Export/Import Logic

- **Export**: Combines active board's `boardName`, tasks, columns, labels, and settings into a single JSON object
- **Export warning**: Before exporting, the app warns that export only includes the active board (not all boards).
- **Import**: Imports from JSON by creating a **new board** (tasks + columns + labels), restores settings when present, and uses `boardName` for the new board when provided; supports backward compatibility
- **Import warning**: Before importing, the app warns that a new board will be created and the UI will switch to it.
- **Filename**: `{boardName}-YYYY-MM-DD.json`

## CSS Architecture

- **Modular file structure**: CSS is organized under `src/styles/` with an `index.css` entry point that uses `@import` to load files in cascade order:
  - `tokens.css` — CSS custom properties for light and dark themes
  - `base.css` — HTML/body element resets
  - `utilities.css` — Utility classes (`.hidden`, `.sr-only`)
  - `layout.css` — App shell: controls bar, brand, search, board container, footer
  - `responsive.css` — All media query overrides (must come last)
  - `components/buttons.css` — Button variants (`.btn`, `.control-btn`)
  - `components/icons.css` — Icon buttons, collapsed column bar, drag handle
  - `components/column.css` — Column card, header, menu, submenu, tasks list, scrollbar
  - `components/card.css` — Task card, title, description, meta, footer, priority badges
  - `components/forms.css` — Form groups, inputs, color picker, hex display, error states
  - `components/modals.css` — Modal, backdrop, content, fullscreen toggle, help content
  - `components/accordion.css` — Reusable collapsible accordion sections (`.accordion-*`)
  - `components/labels.css` — Label badge, management list, checkbox, group headers
  - `components/notifications.css` — Notification banner, items, modal list, badge
  - `components/dragdrop.css` — SortableJS ghost/chosen/drag states, placeholders
  - `components/reports.css` — Reports page layout, KPIs, chart containers
- Vite resolves and bundles all `@import` statements into a single CSS output
- **Theming**: Light/dark mode via `html[data-theme]` attribute; all colors use CSS custom properties defined in `tokens.css`
- Flexbox layouts throughout
- Column width: flex: 1 (equal width)
- Task cards: flex-direction column (text above labels)
- Modals: fixed position, centered with backdrop
- Responsive scrollbars with custom styling
- Task counter: circular badge, 28px diameter

## Event Flow

1. User action (click, drag, form submit)
2. Update localStorage data
3. Call `renderBoard()` to refresh UI
4. Reattach event listeners (drag, click)
5. Reinitialize Lucide icons via `renderIcons()` from `src/modules/icons.js`

## Footer

- Displays storage information (localStorage + export reminder)
- No server required message

## Help Modal

- Explains NO SERVER architecture
- localStorage vs permanent storage
- Import/export instructions
- Feature overview
- Keyboard shortcuts (Escape to close modals)

The canonical Help modal copy lives in `docs/help-how-to.md`.

## Testing

### E2E Testing with Playwright

- **Framework**: Playwright (`@playwright/test`)
- **Configuration**: `playwright.config.js` with local dev server setup
- **Test Location**: `tests/e2e/`
- **Browser project**: Currently runs **Firefox only** (`Desktop Firefox`) via `projects` in `playwright.config.js`
- **Fixture Data**: `tests/fixtures/performance-board.json` (300+ tasks for performance testing)
- **Test Scripts**:
  - `npm test`: Run all Playwright tests
  - `npm run test:ui`: Open Playwright UI mode
  - `npm run test:debug`: Run tests in debug mode

#### Coverage

- **Boards**: board management modal scenarios
- **Task creation**: happy-path creation with due dates and labels
- **Validation**: required-title validation on task creation
- **Drag/drop performance**: moving tasks into Done with 300+ existing Done tasks

### Performance Tests

- **Drag-drop performance**: Measures time to drag a task into Done column with 300+ existing tasks
  - **Target**: <1 second per drop
  - **Fixture**: Pre-populated board with 300 tasks in Done, 10 in In Progress
  - **Assertions**: Drop duration, task counter updates, task visibility in Done
- **Multiple consecutive drops**: Tests average performance across 3 consecutive drops
  - **Target Average**: <800ms per drop
- **Done column virtualization**: Verifies Done column renders initial batch (50 tasks) with "Show more" button when total exceeds batch size

### Test Fixtures

- **Generator Script**: `tests/fixtures/generate-fixture.js` creates performance test boards
- **Fixture Structure**: Compatible with import/export format (columns, tasks, labels, settings)
- **Task Distribution**: 300 tasks in Done, 10 in In Progress, with varied labels and priorities
