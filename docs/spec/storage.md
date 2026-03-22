# Storage

## Persistence Model

All application state is persisted in browser `localStorage`.

## Storage Keys

### Board Registry

- `kanbanBoards` - array of board metadata
- `kanbanActiveBoardId` - last active board id

### Per-Board Data

- `kanbanBoard:<boardId>:tasks`
- `kanbanBoard:<boardId>:columns`
- `kanbanBoard:<boardId>:labels`
- `kanbanBoard:<boardId>:settings`

## Operational Rules

- All CRUD operations read and write against the active board
- Board data is namespaced by board id
- Export operates on the active board only unless the board-management UI exports a selected board
- Import creates a new board from JSON and switches to it

## Migration and Backward Compatibility

- Legacy single-board keys (`kanbanTasks`, `kanbanColumns`, `kanbanLabels`) are migrated into a default board on first run
- Persisted-shape changes must keep import/export round-trippable and preserve legacy normalization where applicable
- Code should go through storage helpers rather than reading localStorage directly

## Settings Persistence

- Settings are per-board and persisted in `kanbanBoard:<boardId>:settings`
- Swim lane row collapse and cell collapse state are persisted as arrays of keys in settings

## Update Requirements

Update this file when you change:

- localStorage keys
- migration logic
- persistence scope
- board scoping rules
- persisted settings shape
