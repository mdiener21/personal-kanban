import { renderBoard } from './modules/render.js';
import { initializeModalHandlers } from './modules/modals.js';
import { exportTasks, importTasks } from './modules/importexport.js';
import { initializeThemeToggle } from './modules/theme.js';
import { initializeBoardsUI } from './modules/boards.js';

// Add task button listeners
document.addEventListener('DOMContentLoaded', () => {
  initializeThemeToggle();

  // Boards (create/select + restore last active)
  initializeBoardsUI();

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

  // Mobile Menu Logic
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const controlsActions = document.getElementById('board-controls-menu');

  if (mobileMenuBtn && controlsActions) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
      
      // Toggle menu
      controlsActions.classList.toggle('show');
      mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
      
      // Close other menus if open (optional, but good practice)
      document.querySelectorAll('.column-menu').forEach(m => m.classList.add('hidden'));
    });

    // Close menu when clicking action buttons inside it.
    // Don't close for form controls like the board <select>, otherwise it's impossible to change selection.
    controlsActions.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;
      const isFormControl = e.target.closest('select, option, input, textarea, label');
      if (isFormControl) return;
      const isAction = e.target.closest('button, a, [role="menuitem"]');
      if (!isAction) return;

      controlsActions.classList.remove('show');
      mobileMenuBtn.setAttribute('aria-expanded', 'false');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!controlsActions.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        controlsActions.classList.remove('show');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

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
