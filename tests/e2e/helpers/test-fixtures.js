import { buildSingleBoardFixture } from './board-seed.js';

export function createColumnMenuFixture() {
  return buildSingleBoardFixture({
    boardId: 'column-menu-test-board',
    boardName: 'Column Menu Test Board',
    columns: [
      { id: 'todo', name: 'To Do', color: '#3583ff', order: 1, collapsed: false },
      { id: 'inprogress', name: 'In Progress', color: '#f59e0b', order: 2, collapsed: false },
      { id: 'done', name: 'Done', color: '#505050', order: 3, collapsed: false }
    ],
    labels: [
      { id: 'task', name: 'Task', color: '#f59e0b', group: 'Activity' }
    ],
    settings: {
      showPriority: true,
      showDueDate: true,
      showAge: true,
      showChangeDate: false,
      locale: 'en-US',
      defaultPriority: 'none',
      notificationDays: 3,
      countdownUrgentThreshold: 3,
      countdownWarningThreshold: 10
    },
    tasks: [
      {
        id: 'task-todo-1',
        title: 'Todo Medium Late',
        description: '',
        priority: 'medium',
        dueDate: '2026-03-20',
        column: 'todo',
        order: 1,
        labels: ['task'],
        creationDate: '2026-02-01T08:00:00.000Z',
        changeDate: '2026-02-01T08:00:00.000Z',
        columnHistory: [{ column: 'todo', at: '2026-02-01T08:00:00.000Z' }]
      },
      {
        id: 'task-todo-2',
        title: 'Todo Urgent Early',
        description: '',
        priority: 'urgent',
        dueDate: '2026-03-10',
        column: 'todo',
        order: 2,
        labels: ['task'],
        creationDate: '2026-02-02T08:00:00.000Z',
        changeDate: '2026-02-02T08:00:00.000Z',
        columnHistory: [{ column: 'todo', at: '2026-02-02T08:00:00.000Z' }]
      },
      {
        id: 'task-todo-3',
        title: 'Todo Low Middle',
        description: '',
        priority: 'low',
        dueDate: '2026-03-15',
        column: 'todo',
        order: 3,
        labels: ['task'],
        creationDate: '2026-02-03T08:00:00.000Z',
        changeDate: '2026-02-03T08:00:00.000Z',
        columnHistory: [{ column: 'todo', at: '2026-02-03T08:00:00.000Z' }]
      }
    ]
  });
}

export function createTaskCardFixture() {
  return buildSingleBoardFixture({
    boardId: 'task-card-test-board',
    boardName: 'Task Card Test Board',
    columns: [
      { id: 'todo', name: 'To Do', color: '#3583ff', order: 1, collapsed: false },
      { id: 'inprogress', name: 'In Progress', color: '#f59e0b', order: 2, collapsed: false },
      { id: 'done', name: 'Done', color: '#505050', order: 3, collapsed: false }
    ],
    labels: [
      { id: 'task', name: 'Task', color: '#f59e0b', group: 'Activity' }
    ],
    settings: {
      showPriority: true,
      showDueDate: true,
      showAge: true,
      showChangeDate: false,
      locale: 'en-US',
      defaultPriority: 'none',
      notificationDays: 3,
      countdownUrgentThreshold: 3,
      countdownWarningThreshold: 10
    },
    tasks: [
      {
        id: 'task-card-1',
        title: 'Delegated Interaction Task',
        description: 'Task description opens editor too',
        priority: 'high',
        dueDate: '2026-03-22',
        column: 'todo',
        order: 1,
        labels: ['task'],
        creationDate: '2026-02-01T08:00:00.000Z',
        changeDate: '2026-02-01T08:00:00.000Z',
        columnHistory: [{ column: 'todo', at: '2026-02-01T08:00:00.000Z' }]
      },
      {
        id: 'task-card-2',
        title: 'Second Task',
        description: 'Used to verify counter changes',
        priority: 'medium',
        dueDate: '2026-03-23',
        column: 'todo',
        order: 2,
        labels: ['task'],
        creationDate: '2026-02-02T08:00:00.000Z',
        changeDate: '2026-02-02T08:00:00.000Z',
        columnHistory: [{ column: 'todo', at: '2026-02-02T08:00:00.000Z' }]
      }
    ]
  });
}
