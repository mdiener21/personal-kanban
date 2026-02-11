// Initialize icons early for initial HTML elements
import './modules/icons.js';

import { renderBoard, setBoardFilterQuery } from './modules/render.js';
import { initializeModalHandlers } from './modules/modals.js';
import { showEditModal } from './modules/modals.js';
import { exportTasks, importTasks } from './modules/importexport.js';
import { initializeThemeToggle } from './modules/theme.js';
import { initializeBoardsUI } from './modules/boards.js';
import { confirmDialog } from './modules/dialog.js';
import { initializeSettingsUI } from './modules/settings.js';
import { initializeNotifications } from './modules/notifications.js';
import { ensureBoardsInitialized, setActiveBoardId, listBoards, getBoardById, loadColumns, loadTasks, loadLabels, loadSettings, saveColumns, saveTasks, saveLabels, saveSettings, createBoard } from './modules/storage.js';
import { setToken, getToken, getUserInfo, loginWithProvider, syncData, fetchBoards, fetchFullBoard } from './modules/sync.js';
import { setupModalCloseHandlers, hideLoginModal } from './modules/modals.js';

// Add task button listeners
document.addEventListener('DOMContentLoaded', async () => {
  // Handle token in URL from social auth callback
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    setToken(token);
    // Remove token from URL
    const nextUrl = window.location.pathname + (window.location.hash || '');
    window.history.replaceState({}, '', nextUrl);
  }

  // Deep-link support (e.g., from calendar.html): open a task modal by ID.
  const openTaskId = (urlParams.get('openTaskId') || '').trim();
  const openTaskBoardId = (urlParams.get('openTaskBoardId') || '').trim();

  if (openTaskBoardId) {
    ensureBoardsInitialized();
    setActiveBoardId(openTaskBoardId);
  }

  const versionEl = document.getElementById('app-version');
  if (versionEl && typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
    versionEl.textContent = `v${__APP_VERSION__}`;
    versionEl.title = `Version ${__APP_VERSION__}`;
  }

  initializeThemeToggle();

  // Settings (per-board)
  initializeSettingsUI();

  // Board-level filter (labels, title, description)
  const boardSearchInput = document.getElementById('board-search-input');
  if (boardSearchInput) {
    boardSearchInput.addEventListener('input', () => {
      setBoardFilterQuery(boardSearchInput.value);
      renderBoard();
    });
  }

  // Boards (create/select + restore last active)
  initializeBoardsUI();

  // Initialize modal handlers
  initializeModalHandlers();

  // Initialize notifications
  initializeNotifications();

  // Auth UI
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const userNameEl = document.getElementById('user-name');
  const syncBtn = document.getElementById('sync-btn');
  const logoutBtn = document.getElementById('logout-btn');

  async function updateAuthUI() {
    const user = await getUserInfo();
    if (user) {
      loginBtn.classList.add('hidden');
      userInfo.classList.remove('hidden');
      userNameEl.textContent = user.name || user.email;
    } else {
      loginBtn.classList.remove('hidden');
      userInfo.classList.add('hidden');
    }
  }

  const loginModal = document.getElementById('login-modal');
  const providerBtns = document.querySelectorAll('.login-provider-btn');

  loginBtn.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
  });

  setupModalCloseHandlers('login-modal', hideLoginModal);

  providerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider;
      loginWithProvider(provider);
    });
  });

  logoutBtn.addEventListener('click', () => {
    setToken(null);
    updateAuthUI();
  });

  syncBtn.addEventListener('click', async () => {
    try {
      syncBtn.disabled = true;
      syncBtn.classList.add('spinning');

      const ok = await confirmDialog({
        title: 'Sync Data',
        message: 'Push local data to cloud or Pull from cloud?',
        confirmText: 'Push to Cloud',
        cancelText: 'Pull from Cloud'
      });

      if (ok) {
        // PUSH
        const boards = listBoards().map(b => {
          const originalActiveBoard = localStorage.getItem('kanbanActiveBoardId');
          localStorage.setItem('kanbanActiveBoardId', b.id);

          const data = {
            ...b,
            columns: loadColumns(),
            tasks: loadTasks(),
            labels: loadLabels(),
            settings: loadSettings()
          };

          localStorage.setItem('kanbanActiveBoardId', originalActiveBoard);
          return data;
        });

        await syncData({ boards });
        alert('Data pushed to cloud successfully!');
      } else {
        // PULL
        const remoteBoards = await fetchBoards();
        if (!remoteBoards || remoteBoards.length === 0) {
          alert('No data found in cloud.');
          return;
        }

        const confirmPull = await confirmDialog({
          title: 'Confirm Pull',
          message: 'This will replace your local data with cloud data. Continue?',
          confirmText: 'Replace Local Data',
          cancelText: 'Cancel'
        });

        if (!confirmPull) return;

        // Clear local boards metadata first
        localStorage.setItem('kanbanBoards', JSON.stringify([]));

        for (const rb of remoteBoards) {
          const fullBoard = await fetchFullBoard(rb.id);

          // Register board metadata
          const localBoards = JSON.parse(localStorage.getItem('kanbanBoards') || '[]');
          localBoards.push({ id: fullBoard.id, name: fullBoard.name, createdAt: fullBoard.createdAt });
          localStorage.setItem('kanbanBoards', JSON.stringify(localBoards));

          // Save board data
          localStorage.setItem(`kanbanBoard:${fullBoard.id}:columns`, JSON.stringify(fullBoard.columns));
          localStorage.setItem(`kanbanBoard:${fullBoard.id}:tasks`, JSON.stringify(fullBoard.tasks));
          localStorage.setItem(`kanbanBoard:${fullBoard.id}:labels`, JSON.stringify(fullBoard.labels));
          localStorage.setItem(`kanbanBoard:${fullBoard.id}:settings`, JSON.stringify(fullBoard.settings));
        }

        if (remoteBoards.length > 0) {
          setActiveBoardId(remoteBoards[0].id);
        }

        renderBoard();
        initializeBoardsUI(); // Refresh board selector
        alert('Data pulled from cloud successfully!');
      }
    } catch (err) {
      console.error('Sync failed', err);
      alert('Sync failed: ' + err.message);
    } finally {
      syncBtn.disabled = false;
      syncBtn.classList.remove('spinning');
    }
  });

  updateAuthUI();

  // Export button listener
  document.getElementById('export-btn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Export Board (Active Only)',
      message:
        'Export ONLY saves the current active board. It does NOT back up all boards.\n\nTo back up everything, export each board individually.\n\nContinue with export?',
      confirmText: 'Export'
    });
    if (!ok) return;
    exportTasks();
  });

  // Import button listener
  document.getElementById('import-btn').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Import Board (New Board)',
      message:
        'Import will CREATE A NEW BOARD and switch to it. Your current active board will not be overwritten.\n\nContinue with import?',
      confirmText: 'Import'
    });
    if (!ok) return;
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
  const menuBtn = document.getElementById('desktop-menu-btn');
  const controlsActions = document.getElementById('board-controls-menu');

  if (menuBtn && controlsActions) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
      
      // Toggle menu
      controlsActions.classList.toggle('show');
      menuBtn.setAttribute('aria-expanded', String(!isExpanded));
      
      // Close other menus if open (optional, but good practice)
      document.querySelectorAll('.column-menu').forEach(m => m.classList.add('hidden'));
    });

    // Close menu when clicking action buttons inside it.
    // Don't close for form controls like the board <select>, otherwise it's impossible to change selection.
    controlsActions.addEventListener('click', (e) => {
      const isFormControl = e.target.closest('select, option, input, textarea, label');
      if (isFormControl) return;
      const isAction = e.target.closest('button, a, [role="menuitem"]');
      if (!isAction) return;

      controlsActions.classList.remove('show');
      menuBtn.setAttribute('aria-expanded', 'false');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!controlsActions.contains(e.target) && !menuBtn.contains(e.target)) {
        controlsActions.classList.remove('show');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Initial render
  renderBoard();

  if (openTaskId) {
    // Open after first render so the board is visible behind the modal.
    showEditModal(openTaskId);

    // Clean up the URL so refresh doesn't re-open.
    const nextUrl = `${window.location.pathname}${window.location.hash || ''}`;
    window.history.replaceState({}, '', nextUrl);
  }
});
