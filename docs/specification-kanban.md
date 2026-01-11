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
  changeDate: "YYYY-MM-DDTHH:MM:SSZ" // updated on task save (create, edit, change column)
}
```

### Column Model

```javascript
{
  id: "column-id",
  name: "Column Name",
  color: "#hexcolor",
  order: number
}
```

### Label Model

```javascript
{
  id: "label-id",
  name: "Label Name",
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
- **Edit**: Open column menu (ellipsis) → pencil, edit name + color in modal
- **Delete**: Open column menu (ellipsis) → trash, confirm if tasks exist
- **Reorder**: Drag via grip icon handle, updates order property
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
- **Edit**: Click task title/description, modal pre-filled with current data
- **Delete**: Click X button, confirm deletion
- **Move**: Drag between columns, auto-saves new column and order
- **Display**: Title (clickable), optional description (clamped to ~2 lines), labels (colored badges), meta row (priority + due date), delete button
- **Footer**: Can show `changeDate` ("Updated …") and task age ("Age …") depending on Settings toggles.
  - `changeDate` is displayed using the user-selected locale (via `toLocaleString(locale)`)
  - Age is based on `creationDate` and displayed as `0d` for < 1 day, `Nd` for days, and `NM` for months (30 days per month, floor)
- **Label selection UX (modal)**:
  - Selected labels are shown as a single horizontal row of colored label pills
  - Each selected label pill has a small **×** button to remove it from the task
  - Label list supports a compact **search/filter** field to quickly find labels
- **Task Limit**: If >12 tasks in column, show scrollbar (max-height 600px). "Show all tasks (N)" button expands to 80vh with scrollbar

### Labels

- **Manage**: Dedicated modal listing all labels with color swatch, name, edit/delete buttons
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
  - Toggle to show/hide task age
  - Toggle to show/hide task updated date/time (`changeDate`)
  - Locale dropdown for formatting the updated timestamp
  - Default task priority dropdown (low/medium/high) used when creating new tasks
- Default locale is initialized from the browser (e.g. `navigator.language`).
- Default priority is `low`.

### Branding

- Brand text displays the active board name (no static title text).

### Icons

- Lucide icons are tree-shaken via `src/modules/icons.js` to minimize bundle size.
- Only icons used in the app are imported and registered.
- Icons used: `SquareKanban`, `Search`, `Plus`, `Settings`, `Columns3`, `Tag`, `SlidersHorizontal`, `Download`, `Upload`, `Moon`, `Sun`, `HelpCircle`, `EllipsisVertical`, `Trash2`, `GripVertical`, `Pencil`
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

- **Desktop**: Default max-height 600px per column task list. If >12 tasks: show "Show all tasks (N)" button. Expanded state: max-height 80vh.
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
- **Filename**: `kanban-board-YYYY-MM-DD.json`

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
