# Personal Kanban Board - Technical Specification

## Technology Rules and Principles

- Only vanilla CSS, JavaScript, and HTML
- Single external dependency: Lucide icons (CDN)
- Storage: browser localStorage only
- Data persistence: JSON import/export to local disk
- No server, no frameworks, no build process

## AI LLM Rules

- Always update the specification upon comnpleting a new tasks to keep the specification up to date.
- Always follow the Technology Rules and Principles section in the document

## Core Data Structures

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

- **localStorage keys**: `kanbanTasks`, `kanbanColumns`, `kanbanLabels`
- All CRUD operations save/load from localStorage
- Export: JSON file with all three data types
- Import: Supports legacy (tasks only) and full format (tasks + columns + labels)

## UI Components

### Board Layout

- Horizontal flexbox container with columns
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

- Help button (opens help modal)
- Manage Labels button
- Add Column button
- Export button (downloads JSON)
- Import button (file picker for JSON)

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

- Task modal (add/edit)
- Column modal (add/edit)
- Labels management modal
- Label add/edit modal
- Help modal
- Close on Escape key or backdrop click

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

- Default: max-height 600px per column task list
- If >12 tasks: show "Show all tasks (N)" button
- Expanded state: max-height 80vh, scrollbar active
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
- No build process
- Lucide icons CDN
- localStorage only (no server, no database)
- Single HTML file + CSS file + JS file

## Export/Import Logic

- **Export**: Combines tasks, columns, labels into single JSON object
- **Import**: Validates structure, supports backward compatibility
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
