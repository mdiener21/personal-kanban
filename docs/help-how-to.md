# Help Modal Copy (In-App)

This file is the canonical user-facing text for the in-app **Help** modal.

## Personal Kanban Board Help

### About This App

This is a fully local personal Kanban board.

- **No server required**: everything runs in your browser.
- **Local-first storage**: data is stored in this browser’s `localStorage`.
- **Backups are your responsibility**: export regularly if you care about the data.

### Controls Menu

All controls are in the header menu.

- Click the **ellipsis (⋮)** menu button to open the controls dropdown.
- Use **Board Select** to switch boards.
- Use **New Board** to create a board.
- Use **Manage Boards** to open/rename/delete boards.
- Use **Add Column**, **Manage Labels**, **Export**, **Import**, **Theme**, and **Help** from the same menu.

### Boards

- **Switch boards** using the board dropdown.
- The **last active board is restored** when you return.
- **Manage Boards** lets you:
  - Open a board
  - Rename a board
  - Delete a board (confirmation required)
  - The last remaining board cannot be deleted

### Tasks

- **Add**: click the **plus** icon in a column header.
- **Edit**: click a task card to edit its title/description/priority/due date/column/labels.
- **Move**: drag and drop tasks between columns.
- **Delete**: click the task **trash** button and confirm.

### Columns

- **Add**: click **Add Column**.
- **Edit/Delete**: use the column **ellipsis** menu.
- **Reorder**: drag the column **grip handle**.
- **Deleting a column**:
  - If the column has tasks, you’ll be warned that tasks will also be deleted.
  - The last remaining column cannot be deleted.

### Labels

- Open **Manage Labels** to create, edit, or delete labels.
- Assign labels while editing a task.
- The task editor includes:
  - A **selected labels** row (pills)
  - A **search box** to filter labels
- Deleting a label removes it from all tasks (confirmation required).

### Import / Export (Backups)

- **Export** downloads the active board (columns + tasks + labels) as a JSON file.
- **Import** loads a JSON file into the active board.

Important notes:
- Clearing site data, using private browsing, or switching browsers/devices can make your data disappear.
- Export regularly if you want a durable backup.

### Keyboard & Modal Shortcuts

- **Escape** closes most modals.
- Clicking the **backdrop** closes most modals.

### Tips

- Export on a schedule (end of day / end of week).
- Use multiple boards to separate contexts (work, personal, projects).
- Use labels to slice across columns (e.g., Urgent, Feature, Task).
