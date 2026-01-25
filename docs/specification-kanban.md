# Personal Kanban Board - Technical Specification

## Technology Rules and Principles

- Only vanilla CSS, JavaScript, and HTML
- Minimal dependencies:
  - **Lucide icons**: Tree-shaken ES module import (not CDN) via `src/modules/icons.js`
  - **SortableJS**: Drag-and-drop library for tasks and columns
- Storage: browser localStorage only
- Data persistence: JSON import/export to local disk
- No server, no frameworks
- Build tooling: Vite (ES modules)

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
  priority: "low" | "medium" | "high",
  dueDate: "YYYY-MM-DD" | "",
  column: "column-id",
  order: number,
  labels: ["label-id-1", "label-id-2"],
  creationDate: "YYYY-MM-DDTHH:MM:SSZ",
  changeDate: "YYYY-MM-DDTHH:MM:SSZ", // updated on task save (create, edit, change column)
  doneDate: "YYYY-MM-DDTHH:MM:SSZ" // set only when task enters the Done column; removed when leaving Done
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
  color: "#hexcolor"
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

- **Create**: Modal form with column name input + color picker
- **New column placement**: Newly created column are inserted to the far right of the board but before column `done` (order `-1`).
- **Edit**: Open column menu (ellipsis) → pencil, edit name + color in modal
- **Delete**: Open column menu (ellipsis) → trash, confirm if tasks exist
- **Permanent Done column**: The column with id `done` cannot be deleted.
- **Reorder**: Drag via grip icon handle, updates order property
- **Collapse**: Toggle button (left of the grip handle) collapses a column into a ~20px vertical bar; state is stored per column.
- **Actions**: Plus icon (add task), pencil (edit), trash (delete)

#### Column Header Actions

- Plus icon: adds a task to this column
- Ellipsis icon: opens a small menu with Edit (pencil) and Delete (trash)

#### Column Color

- Each column has a user-selected hex `color`.
- Column UI uses this color as its accent.
- Tasks inside the column inherit the column accent color for consistent styling.

### Task Features

- **Create**: Click plus icon in column header, modal with Title, Description, Priority, Due Date, column select, label checkboxes
- **New task placement**: Newly created tasks are inserted at the top of the selected column (order `1`).
- **Edit**: Click task title/description, modal pre-filled with current data
- **Edit (full page)**: In the Edit Task modal, an "Open in full page" button (fullscreen icon) expands the modal to full-screen size on larger screens
- **Delete**: Click X button, confirm deletion
- **Move**: Drag between columns, auto-saves new column and order
- **Display**: Title (clickable), optional description (clamped to ~2 lines), labels (colored badges), optional meta row (priority and/or due date depending on Settings), delete button
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
- **Task Limit**: If >12 tasks in column, show scrollbar (max-height 600px). "Show all tasks (N)" button expands to 80vh with scrollbar

### Labels

- **Manage**: Dedicated modal listing all labels with color swatch, name, edit/delete buttons
  - Includes a search field to filter labels by name (case-insensitive substring match)
- **Create/Edit**: Modal with name input and color picker
- **Delete**: Removes from all tasks, confirms deletion
- **Assign**: Checkboxes in task modal, multiple labels per task
- **Display**: Colored badges with label names on tasks

### Controls Bar

- Toolbar includes a **board-level task search** input (with a search icon) placed beside the brand area.
  - Filtering is **in-memory** (no persistence) and applies to the currently rendered board.
  - A task matches if the search string appears in **task title**, **task description**, **task priority** (low/medium/high), or the **label name** of any label assigned to the task (case-insensitive substring match).

- Single menu button (ellipsis) that opens a dropdown containing:
  - Board selector dropdown (shows all boards)
  - Manage Boards button (opens boards management modal)
  - Help button (opens help modal)
  - Manage Labels button
  - Settings button (opens Settings modal)
  - Add Column button
  - Export button (downloads JSON)
  - Import button (file picker for JSON)

### Settings

- Settings are **per active board** and stored in localStorage (`kanbanBoard:<boardId>:settings`).
- Settings modal allows:
  - Toggle to show/hide task priority
  - Toggle to show/hide task due date
  - Toggle to show/hide task age
  - Toggle to show/hide task updated date/time (`changeDate`)
  - Locale dropdown for formatting the updated timestamp
  - Default task priority dropdown (low/medium/high) used when creating new tasks
- Default locale is initialized from the browser (e.g. `navigator.language`).
- Default priority is `low`.

### Branding

- Brand text displays the active board name (no static title text).

### Reports

- Separate page: `reports.html`
- Shows an Apache ECharts calendar heatmap for the **active board** covering the last 365 days.
- Each day’s value is the count of tasks whose `changeDate` falls on that date (YYYY-MM-DD).

#### Lead Time & Completion

- Reports dashboard also shows **weekly lead time** for completed tasks (creation → done):
  - Uses `creationDate` and `doneDate` on tasks.
  - Lead time is grouped by week (Monday-start), displayed as a **bar chart** of **average lead time (days)**.
  - Includes a **trend line** (4-week moving average).
- Reports dashboard also shows a **weekly completion summary**:
  - KPI tiles for “Completed this week”, “Completed last week”, and “Avg lead time (last 12 weeks)”.
  - A small sparkline chart of tasks completed per week (last 12 weeks).

### Icons

- Lucide icons are tree-shaken via `src/modules/icons.js` to minimize bundle size.
- Only icons used in the app are imported and registered.
- Icons used: `SquareKanban`, `Search`, `Plus`, `Fullscreen`, `Settings`, `Columns3`, `Tag`, `SlidersHorizontal`, `Download`, `Upload`, `Moon`, `Sun`, `HelpCircle`, `EllipsisVertical`, `Trash2`, `GripVertical`, `Pencil`, `Kanban`
- To add a new icon:
  1. Import it from `lucide` in `icons.js`
  2. Add it to the `icons` object (PascalCase key)
- Call `renderIcons()` after dynamically adding elements with `data-lucide` attributes.

## Key Behaviors

### Drag and Drop

- **Tasks**: Draggable within and between columns, placeholder shows drop location
- **Columns**: Draggable via grip handle only, placeholder shows drop position
- **Order Tracking**: Both tasks and columns have order property (1-based), updated on drop
- **Auto-save**: On drop, recalculates all positions and saves to localStorage, then re-renders board

### Rendering

- `renderBoard()` clears container, recreates all columns/tasks from localStorage
- Sorts columns by order property
- Sorts tasks within each column by order property
- Called after every data modification
- Reinitializes Lucide icons via `renderIcons()` after render

### Modals

- **Mobile Behavior**: Full-screen modals with scrollable form and sticky footer. "Manage Labels" list expands to fill the screen. Task editor label list is height-capped with a scrollbar.
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
  - Description (optional)
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
- Single HTML entry + CSS + JS modules

## Export/Import Logic

- **Export**: Combines active board's `boardName`, tasks, columns, labels, and settings into a single JSON object
- **Export warning**: Before exporting, the app warns that export only includes the active board (not all boards).
- **Import**: Imports from JSON by creating a **new board** (tasks + columns + labels), restores settings when present, and uses `boardName` for the new board when provided; supports backward compatibility
- **Import warning**: Before importing, the app warns that a new board will be created and the UI will switch to it.
- **Filename**: `{boardName}-YYYY-MM-DD.json`

## CSS Architecture

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
