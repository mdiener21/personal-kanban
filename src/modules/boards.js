import { generateUUID } from './utils.js';
import { renderBoard } from './render.js';
import {
  ensureBoardsInitialized,
  listBoards,
  createBoard,
  getActiveBoardId,
  setActiveBoardId,
  getActiveBoardName
} from './storage.js';

function boardDisplayName(board) {
  const name = typeof board?.name === 'string' ? board.name.trim() : '';
  return name || 'Untitled board';
}

function refreshBoardSelect(selectEl) {
  const boards = listBoards();
  const activeId = getActiveBoardId();

  selectEl.innerHTML = '';

  boards.forEach((b) => {
    const option = document.createElement('option');
    option.value = b.id;
    option.textContent = boardDisplayName(b);
    selectEl.appendChild(option);
  });

  if (activeId) selectEl.value = activeId;
}

function refreshBrandText() {
  const brandEl = document.getElementById('brand-text') || document.querySelector('.brand-text');
  if (!brandEl) return;
  brandEl.textContent = getActiveBoardName();
}

export function initializeBoardsUI() {
  ensureBoardsInitialized();

  const selectEl = document.getElementById('board-select');
  const newBtn = document.getElementById('new-board-btn');

  if (!selectEl || !newBtn) return;

  refreshBoardSelect(selectEl);
  refreshBrandText();

  selectEl.addEventListener('change', () => {
    const id = selectEl.value;
    if (!id) return;
    setActiveBoardId(id);
    refreshBrandText();
    renderBoard();

    // On mobile, collapse the dropdown menu after a selection.
    if (window.innerWidth <= 768) {
      const controlsActions = document.getElementById('board-controls-menu');
      const mobileMenuBtn = document.getElementById('mobile-menu-btn');
      controlsActions?.classList.remove('show');
      mobileMenuBtn?.setAttribute('aria-expanded', 'false');
    }
  });

  newBtn.addEventListener('click', () => {
    const name = window.prompt('New board name:');
    if (name === null) return; // cancelled

    const trimmed = name.trim();
    if (!trimmed) {
      alert('Board name cannot be empty.');
      return;
    }

    const board = createBoard(trimmed);
    setActiveBoardId(board.id);
    refreshBoardSelect(selectEl);
    refreshBrandText();
    renderBoard();
  });
}
