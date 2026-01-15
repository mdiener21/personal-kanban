import { generateUUID } from './utils.js';
import { loadLabels, saveLabels, loadTasks, saveTasks } from './storage.js';

const MAX_LABEL_NAME_LENGTH = 40;

// Add a new label
export function addLabel(name, color) {
  if (!name || name.trim() === '') return;

  const trimmedName = name.trim().slice(0, MAX_LABEL_NAME_LENGTH);
  
  const labels = loadLabels();
  const id = trimmedName.toLowerCase().replace(/\s+/g, '-') + '-' + generateUUID().substring(0, 8);
  const newLabel = { id, name: trimmedName, color };
  labels.push(newLabel);
  saveLabels(labels);
  return newLabel;
}

// Update an existing label
export function updateLabel(labelId, name, color) {
  if (!name || name.trim() === '') return;

  const trimmedName = name.trim().slice(0, MAX_LABEL_NAME_LENGTH);
  
  const labels = loadLabels();
  const labelIndex = labels.findIndex(l => l.id === labelId);
  if (labelIndex !== -1) {
    labels[labelIndex].name = trimmedName;
    labels[labelIndex].color = color;
    saveLabels(labels);
  }
}

// Delete a label
export function deleteLabel(labelId) {
  const labels = loadLabels();
  const tasks = loadTasks();
  
  // Remove label from all tasks
  tasks.forEach(task => {
    if (task.labels) {
      task.labels = task.labels.filter(id => id !== labelId);
    }
  });
  saveTasks(tasks);
  
  // Remove the label
  const filteredLabels = labels.filter(l => l.id !== labelId);
  saveLabels(filteredLabels);
}
