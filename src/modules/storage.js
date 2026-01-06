import { generateUUID } from './utils.js';

// Load columns from localStorage
export function loadColumns() {
  const stored = localStorage.getItem('kanbanColumns');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore malformed localStorage
    }
  }
  // Default columns if none exist
  return [
    { id: 'todo', name: 'To Do' },
    { id: 'inprogress', name: 'In Progress' },
    { id: 'done', name: 'Done' }
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
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore malformed localStorage
    }
  }
  // Default tasks if none exist
  return [
    { id: generateUUID(), text: 'Find out where Soul Stone is', column: 'todo', labels: ['urgent'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Time Stone from Dr. Strange', column: 'verified', labels: ['feature'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Mind Stone from Vision', column: 'verified', labels: [], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Reality Stone from the Collector', column: 'verified', labels: ['bug'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Power Stone from Xandar', column: 'done', labels: ['urgent', 'feature'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Space Stone from Asgard', column: 'done', labels: [], creationDate: new Date().toISOString() }
  ];
}

// Save tasks to localStorage
export function saveTasks(tasks) {
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
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
