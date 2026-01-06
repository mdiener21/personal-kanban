import { loadTasks, loadColumns, loadLabels, saveColumns, saveTasks, saveLabels } from './storage.js';

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
      
      // Validate tasks
      const isValidTasks = tasks.every(task => 
        task.id && task.text && task.column
      );
      
      // Validate columns
      const isValidColumns = columns.every(col => 
        col.id && col.name
      );
      
      // Validate labels (optional)
      const isValidLabels = !labels || labels.every(label => 
        label.id && label.name && label.color
      );
      
      if (!isValidTasks || !isValidColumns || !isValidLabels) {
        alert('Invalid data structure');
        return;
      }
      
      saveColumns(columns);
      saveTasks(tasks);
      if (labels) saveLabels(labels);
      
      const { renderBoard } = await import('./render.js');
      renderBoard();
      alert('Board imported successfully!');
    } catch (error) {
      alert('Error parsing JSON file: ' + error.message);
    }
  };
  reader.readAsText(file);
}
