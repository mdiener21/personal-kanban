import { renderBoard } from './modules/render.js';
import { initializeModalHandlers } from './modules/modals.js';
import { exportTasks, importTasks } from './modules/importexport.js';

// Add task button listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize modal handlers
  initializeModalHandlers();

  // Export button listener
  document.getElementById('export-btn').addEventListener('click', exportTasks);

  // Import button listener
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importTasks(file);
    }
    e.target.value = '';
  });

  // Warn user before closing tab
  window.addEventListener('beforeunload', (e) => {
    const message = 'Your board data is stored in browser localStorage. Please export to a JSON file to save your work before closing.';
    e.preventDefault();
    e.returnValue = message;
    return message;
  });

  // Initial render
  renderBoard();
});
