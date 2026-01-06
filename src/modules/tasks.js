import { generateUUID } from './utils.js';
import { loadTasks, saveTasks } from './storage.js';

// Add a new task
export function addTask(text, columnName, labels = []) {
  if (!text || text.trim() === '') return;
  
  const tasks = loadTasks();
  // Get max order for tasks in this column
  const columnTasks = tasks.filter(t => t.column === columnName);
  const maxOrder = columnTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
  
  const newTask = {
    id: generateUUID(),
    text: text.trim(),
    column: columnName,
    order: maxOrder + 1,
    labels: [...labels],
    creationDate: new Date().toISOString()
  };
  tasks.push(newTask);
  saveTasks(tasks);
}

// Update an existing task
export function updateTask(taskId, text, columnName, labels = []) {
  if (!text || text.trim() === '') return;
  
  const tasks = loadTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].text = text.trim();
    tasks[taskIndex].column = columnName;
    tasks[taskIndex].labels = [...labels];
    saveTasks(tasks);
  }
}

// Delete a task
export function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return false;
  }
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
  
  // Update each task with new column and order based on DOM position
  const updatedTasks = tasks.map(task => {
    const currentIndex = currentOrder.findIndex(c => c.id === task.id);
    if (currentIndex !== -1) {
      const current = currentOrder[currentIndex];
      // Calculate order within column
      const tasksInSameColumn = currentOrder.filter((t, i) => t.column === current.column && i <= currentIndex);
      return { ...task, column: current.column, order: tasksInSameColumn.length };
    }
    return task;
  });
  
  saveTasks(updatedTasks);
}
