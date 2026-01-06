import { loadTasks, loadColumns, loadLabels, saveColumns, saveTasks, saveLabels } from './storage.js';

function isHexColor(value) {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function normalizeImportedTasks(tasks) {
  if (!Array.isArray(tasks)) return null;

  const normalized = tasks.map((t) => {
    const id = typeof t?.id === 'string' ? t.id : String(t?.id ?? '');
    const text = typeof t?.text === 'string' ? t.text : String(t?.text ?? '');
    const column = typeof t?.column === 'string' ? t.column : String(t?.column ?? '');

    const labels = Array.isArray(t?.labels) ? t.labels.map((l) => (typeof l === 'string' ? l : String(l))) : [];
    const order = Number.isFinite(t?.order) ? t.order : undefined;
    const creationDate = typeof t?.creationDate === 'string' ? t.creationDate : undefined;

    return {
      id: id.trim(),
      text: text.trim(),
      column: column.trim(),
      ...(order !== undefined ? { order } : {}),
      ...(creationDate ? { creationDate } : {}),
      labels
    };
  });

  const isValid = normalized.every((t) => t.id && t.text && t.column);
  return isValid ? normalized : null;
}

function normalizeImportedColumns(columns) {
  if (!Array.isArray(columns)) return null;

  const normalized = columns.map((c) => {
    const id = typeof c?.id === 'string' ? c.id : String(c?.id ?? '');
    const name = typeof c?.name === 'string' ? c.name : String(c?.name ?? '');
    const order = Number.isFinite(c?.order) ? c.order : undefined;
    return {
      id: id.trim(),
      name: name.trim(),
      ...(order !== undefined ? { order } : {})
    };
  });

  const isValid = normalized.every((c) => c.id && c.name);
  return isValid ? normalized : null;
}

function normalizeImportedLabels(labels) {
  if (!Array.isArray(labels)) return null;

  const normalized = labels.map((l) => {
    const id = typeof l?.id === 'string' ? l.id : String(l?.id ?? '');
    const name = typeof l?.name === 'string' ? l.name : String(l?.name ?? '');
    const color = isHexColor(l?.color) ? l.color.trim() : '#3b82f6';
    return { id: id.trim(), name: name.trim(), color };
  });

  const isValid = normalized.every((l) => l.id && l.name && l.color);
  return isValid ? normalized : null;
}

// Export tasks and columns to JSON file
export function exportTasks() {
  const tasks = loadTasks();
  const columns = loadColumns();
  const labels = loadLabels();
  const exportData = { columns, tasks, labels };
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `kanban-board-${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import tasks and columns from JSON file
export function importTasks(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      // Support multiple formats for backward compatibility
      let tasks, columns, labels;
      
      if (Array.isArray(data)) {
        // Old format: just tasks array
        tasks = data;
        columns = loadColumns(); // Keep existing columns
        labels = loadLabels(); // Keep existing labels
      } else if (data.tasks && data.columns) {
        // New format: object with columns and tasks (and optionally labels)
        tasks = data.tasks;
        columns = data.columns;
        labels = data.labels || loadLabels(); // Use imported labels or keep existing
      } else {
        alert('Invalid JSON file format');
        return;
      }

      const normalizedTasks = normalizeImportedTasks(tasks);
      const normalizedColumns = normalizeImportedColumns(columns);
      const normalizedLabels = labels ? normalizeImportedLabels(labels) : null;

      if (!normalizedTasks || !normalizedColumns || (labels && !normalizedLabels)) {
        alert('Invalid data structure');
        return;
      }

      saveColumns(normalizedColumns);
      saveTasks(normalizedTasks);
      if (normalizedLabels) saveLabels(normalizedLabels);
      
      const { renderBoard } = await import('./render.js');
      renderBoard();
      alert('Board imported successfully!');
    } catch (error) {
      alert('Error parsing JSON file: ' + error.message);
    }
  };
  reader.readAsText(file);
}
