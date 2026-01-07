import { generateUUID } from './utils.js';

let taskCache = null;

function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function defaultColumnColor(id) {
  if (id === 'todo') return '#3b82f6';
  if (id === 'inprogress') return '#f59e0b';
  if (id === 'done') return '#16a34a';
  return '#3b82f6';
}

function normalizeColumn(c) {
  const color = isHexColor(c?.color) ? c.color.trim() : defaultColumnColor(c?.id);
  return { ...c, color };
}

// Load columns from localStorage
export function loadColumns() {
  const stored = localStorage.getItem('kanbanColumns');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.map(normalizeColumn);
    } catch {
      // ignore malformed localStorage
    }
  }
  // Default columns if none exist
  return [
    { id: 'todo', name: 'To Do', color: '#3b82f6' },
    { id: 'inprogress', name: 'In Progress', color: '#f59e0b' },
    { id: 'done', name: 'Done', color: '#16a34a' }
  ];
}

// Save columns to localStorage
export function saveColumns(columns) {
  localStorage.setItem('kanbanColumns', JSON.stringify(columns));
}

// Load tasks from localStorage
export function loadTasks() {
  const stored = localStorage.getItem('kanbanTasks');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        taskCache = parsed;
        return parsed;
      }
    } catch {
      // ignore malformed localStorage
    }
  }
  // If localStorage is empty, keep a stable in-memory default set for this session.
  // This avoids IDs changing between renders and click handlers on first load.
  if (Array.isArray(taskCache)) return taskCache;
  // Default tasks if none exist
  taskCache = [
    {
      id: generateUUID(),
      title: 'Find out where the Soul Stone is',
      description: 'Identify current location and access requirements.',
      priority: 'high',
      dueDate: '',
      column: 'todo',
      labels: ['urgent'],
      creationDate: new Date().toISOString()
    },
    {
      id: generateUUID(),
      title: 'Collect the Time Stone',
      description: 'Coordinate with Dr. Strange and plan retrieval.',
      priority: 'medium',
      dueDate: '',
      column: 'inprogress',
      labels: ['feature'],
      creationDate: new Date().toISOString()
    },
    {
      id: generateUUID(),
      title: 'Collect the Mind Stone',
      description: 'Determine safe extraction approach.',
      priority: 'medium',
      dueDate: '',
      column: 'inprogress',
      labels: [],
      creationDate: new Date().toISOString()
    },
    {
      id: generateUUID(),
      title: 'Collect the Reality Stone',
      description: 'Negotiate with the Collector, avoid escalation.',
      priority: 'low',
      dueDate: '',
      column: 'inprogress',
      labels: ['task'],
      creationDate: new Date().toISOString()
    },
    {
      id: generateUUID(),
      title: 'Collect the Power Stone',
      description: 'Verify secure containment after retrieval.',
      priority: 'high',
      dueDate: '',
      column: 'done',
      labels: ['urgent', 'feature'],
      creationDate: new Date().toISOString()
    },
    {
      id: generateUUID(),
      title: 'Collect the Space Stone',
      description: '',
      priority: 'low',
      dueDate: '',
      column: 'done',
      labels: [],
      creationDate: new Date().toISOString()
    }
  ];

  return taskCache;
}

// Save tasks to localStorage
export function saveTasks(tasks) {
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
  taskCache = tasks;
}

// Load labels from localStorage
export function loadLabels() {
  const stored = localStorage.getItem('kanbanLabels');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore malformed localStorage
    }
  }
  // Default labels if none exist
  return [
    { id: 'urgent', name: 'Urgent', color: '#ef4444' },
    { id: 'feature', name: 'Feature', color: '#3b82f6' },
    { id: 'task', name: 'Task', color: '#f59e0b' }
  ];
}

// Save labels to localStorage
export function saveLabels(labels) {
  localStorage.setItem('kanbanLabels', JSON.stringify(labels));
}
