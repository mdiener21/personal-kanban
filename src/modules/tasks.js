import { generateUUID } from './utils.js';
import { loadTasks, saveTasks } from './storage.js';

const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high']);

function normalizePriority(priority) {
  const value = (priority || '').toString().trim().toLowerCase();
  return ALLOWED_PRIORITIES.has(value) ? value : 'low';
}

function normalizeDueDate(value) {
  const date = (value || '').toString().trim();
  // Expecting YYYY-MM-DD from <input type="date">; keep empty if unset.
  return date;
}

// Add a new task
export function addTask(title, description, priority, dueDate, columnName, labels = []) {
  if (!title || title.trim() === '') return;
  
  const tasks = loadTasks();
  // Insert new tasks at the top of the column.
  // Normalize the column's existing task orders so they start at 2 (leaving 1 for the new task).
  const columnTasks = tasks
    .filter((t) => t.column === columnName)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const nextOrderById = new Map();
  columnTasks.forEach((task, index) => {
    nextOrderById.set(task.id, index + 2);
  });

  const updatedTasks = tasks.map((task) => {
    if (task.column !== columnName) return task;
    const nextOrder = nextOrderById.get(task.id);
    return typeof nextOrder === 'number' ? { ...task, order: nextOrder } : task;
  });
  
  const nowIso = new Date().toISOString();
  const newTask = {
    id: generateUUID(),
    title: title.trim(),
    description: (description || '').toString().trim(),
    priority: normalizePriority(priority),
    dueDate: normalizeDueDate(dueDate),
    column: columnName,
    order: 1,
    labels: [...labels],
    creationDate: nowIso,
    changeDate: nowIso,
    ...(columnName === 'done' ? { doneDate: nowIso } : {})
  };

  updatedTasks.push(newTask);
  saveTasks(updatedTasks);
}

// Update an existing task
export function updateTask(taskId, title, description, priority, dueDate, columnName, labels = []) {
  if (!title || title.trim() === '') return;
  
  const tasks = loadTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    const prevColumn = tasks[taskIndex].column;
    const nextColumn = columnName;
    const nowIso = new Date().toISOString();

    tasks[taskIndex].title = title.trim();
    tasks[taskIndex].description = (description || '').toString().trim();
    tasks[taskIndex].priority = normalizePriority(priority);
    tasks[taskIndex].dueDate = normalizeDueDate(dueDate);
    tasks[taskIndex].column = nextColumn;
    tasks[taskIndex].labels = [...labels];

    if (prevColumn !== 'done' && nextColumn === 'done') {
      tasks[taskIndex].doneDate = nowIso;
    } else if (prevColumn === 'done' && nextColumn !== 'done') {
      delete tasks[taskIndex].doneDate;
    }

    tasks[taskIndex].changeDate = nowIso;
    saveTasks(tasks);
  }
}

// Delete a task
export function deleteTask(taskId) {
  const tasks = loadTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  saveTasks(filtered);
  return true;
}

// Get current task positions from DOM
export function getCurrentTaskOrder() {
  const tasks = [];
  document.querySelectorAll('.task-column').forEach(column => {
    const columnName = column.dataset.column;
    column.querySelectorAll('.task').forEach(taskEl => {
      tasks.push({
        id: taskEl.dataset.taskId,
        column: columnName
      });
    });
  });
  return tasks;
}

// Update task positions after drag
export function updateTaskPositions() {
  const currentOrder = getCurrentTaskOrder();
  const tasks = loadTasks();
  const nowIso = new Date().toISOString();
  
  // Update each task with new column and order based on DOM position
  const updatedTasks = tasks.map(task => {
    const currentIndex = currentOrder.findIndex(c => c.id === task.id);
    if (currentIndex !== -1) {
      const current = currentOrder[currentIndex];
      // Calculate order within column
      const tasksInSameColumn = currentOrder.filter((t, i) => t.column === current.column && i <= currentIndex);
      const nextColumn = current.column;
      const nextOrder = tasksInSameColumn.length;
      const didMove = task.column !== nextColumn;
      const nextTask = {
        ...task,
        column: nextColumn,
        order: nextOrder,
        ...(didMove ? { changeDate: nowIso } : {})
      };

      if (didMove) {
        if (task.column !== 'done' && nextColumn === 'done') {
          nextTask.doneDate = nowIso;
        } else if (task.column === 'done' && nextColumn !== 'done') {
          delete nextTask.doneDate;
        }
      }

      return {
        ...nextTask
      };
    }
    return task;
  });
  
  saveTasks(updatedTasks);
}
