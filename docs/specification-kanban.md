# Personal Kanban Board - Technical Specification

## Technology Rules and Principles

- Only vanilla CSS, JavaScript, and HTML
- Single external dependency: Lucide icons (CDN)
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
  creationDate: "YYYY-MM-DDTHH:MM:SSZ"
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
- **Display**: Title (clickable), optional description, labels (colored badges), meta row (priority + due date), delete button
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

- Board selector dropdown (shows all boards)
- New Board button (prompt for name)
- Manage Boards button (opens boards management modal)
- Help button (opens help modal)
- Manage Labels button
- Add Column button
- Export button (downloads JSON)
- Import button (file picker for JSON)

### Branding

- Brand text displays the active board name (no static title text).

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
- Reinitializes Lucide icons after render

### Modals

- **Mobile Behavior**: Full-screen modals with scrollable form and sticky footer. "Manage Labels" list expands to fill the screen. "Edit Task" label selection shows full list.
- Task modal (add/edit)
- Column modal (add/edit)
- Labels management modal
- Boards management modal
- Label add/edit modal
- Help modal
- Close on Escape key or backdrop click

### Boards

- **Select active board**: via the board dropdown; selection persists and is restored on next page load.
- **Create board**: via New Board button (prompt for name). New boards start with default columns + labels, and empty tasks.
- **Manage boards**: via Manage Boards modal:
  - List boards
  - Open a board (sets active and renders)
  - Rename a board
  - Delete a board (always confirms: “Do you really want to delete…?”)
  - The last remaining board cannot be deleted
- **Mobile UX**:
  - Board selector is full-width with a larger tap target.
  - The mobile menu does not auto-close when interacting with the dropdown.

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
- Lucide icons CDN
- localStorage only (no server, no database)
- Single HTML entry + CSS + JS modules

## Export/Import Logic

- **Export**: Combines active board's tasks, columns, labels into single JSON object
- **Import**: Imports into the active board (tasks + columns + labels), supports backward compatibility
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
5. Reinitialize Lucide icons

## Footer

- Displays storage information (localStorage + export reminder)
- No server required message

## Help Modal

- Explains NO SERVER architecture
- localStorage vs permanent storage
- Import/export instructions
- Feature overview
- Keyboard shortcuts (Escape to close modals)
