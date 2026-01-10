import { loadLabels, loadColumns, loadTasks, loadSettings } from './storage.js';
import { addTask, updateTask, deleteTask } from './tasks.js';
import { addColumn, updateColumn, deleteColumn } from './columns.js';
import { addLabel, updateLabel, deleteLabel } from './labels.js';
import {
  ensureBoardsInitialized,
  listBoards,
  getActiveBoardId,
  setActiveBoardId,
  getActiveBoardName,
  renameBoard,
  deleteBoard as deleteBoardById
} from './storage.js';
import { confirmDialog, alertDialog } from './dialog.js';
import { renderIcons } from './icons.js';

// Modal state
let currentColumn = 'todo';
let editingTaskId = null;
let editingColumnId = null;
let editingLabelId = null;
let editingBoardId = null;
let selectedTaskLabels = [];

function getTaskLabelSearchQuery() {
  const input = document.getElementById('task-label-search');
  return (input?.value || '').trim().toLowerCase();
}

function renderActiveTaskLabels() {
  const container = document.getElementById('task-active-labels');
  if (!container) return;

  const allLabels = loadLabels();
  // De-dupe while preserving order
  const uniqueSelected = [];
  for (const labelId of selectedTaskLabels) {
    if (!uniqueSelected.includes(labelId)) uniqueSelected.push(labelId);
  }
  selectedTaskLabels = uniqueSelected;

  const selectedLabels = uniqueSelected
    .map((id) => allLabels.find((l) => l.id === id))
    .filter(Boolean);

  container.innerHTML = '';
  container.style.display = selectedLabels.length > 0 ? 'flex' : 'none';

  selectedLabels.forEach((label) => {
    const pill = document.createElement('span');
    pill.classList.add('task-label');
    pill.style.backgroundColor = label.color;
    pill.textContent = label.name;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('active-label-remove');
    removeBtn.setAttribute('aria-label', `Remove label ${label.name}`);
    removeBtn.title = 'Remove label';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectedTaskLabels = selectedTaskLabels.filter((id) => id !== label.id);
      renderActiveTaskLabels();
      updateTaskLabelsSelection();
    });

    pill.appendChild(removeBtn);
    container.appendChild(pill);
  });
}

export function showModal(columnName) {
  currentColumn = columnName || loadColumns()[0]?.id || 'todo';
  editingTaskId = null;
  selectedTaskLabels = [];
  
  const modal = document.getElementById('task-modal');
  const columnSelect = document.getElementById('task-column');
  const taskTitle = document.getElementById('task-title');
  const taskDescription = document.getElementById('task-description');
  const taskPriority = document.getElementById('task-priority');
  const taskDueDate = document.getElementById('task-due-date');
  const modalTitle = document.getElementById('task-modal-title');
  const submitBtn = document.getElementById('task-submit-btn');
  
  modalTitle.textContent = 'Add New Task';
  submitBtn.textContent = 'Add Task';
  columnSelect.value = currentColumn;
  taskTitle.value = '';
  taskDescription.value = '';
  if (taskPriority) {
    const settings = loadSettings();
    taskPriority.value = settings.defaultPriority || 'low';
  }
  if (taskDueDate) taskDueDate.value = '';

  const labelSearch = document.getElementById('task-label-search');
  if (labelSearch) labelSearch.value = '';

  updateTaskLabelsSelection();
  modal.classList.remove('hidden');
  taskTitle.focus();
}

export function showEditModal(taskId) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  editingTaskId = taskId;
  selectedTaskLabels = task.labels || [];
  
  const modal = document.getElementById('task-modal');
  const columnSelect = document.getElementById('task-column');
  const taskTitle = document.getElementById('task-title');
  const taskDescription = document.getElementById('task-description');
  const taskPriority = document.getElementById('task-priority');
  const taskDueDate = document.getElementById('task-due-date');
  const modalTitle = document.getElementById('task-modal-title');
  const submitBtn = document.getElementById('task-submit-btn');
  
  modalTitle.textContent = 'Edit Task';
  submitBtn.textContent = 'Save Changes';
  columnSelect.value = task.column;

  const legacyTitle = typeof task.text === 'string' ? task.text : '';
  taskTitle.value = (typeof task.title === 'string' && task.title.trim() !== '') ? task.title : legacyTitle;
  taskDescription.value = typeof task.description === 'string' ? task.description : '';
  if (taskPriority) taskPriority.value = typeof task.priority === 'string' ? task.priority : 'medium';

  const rawDue = typeof task.dueDate === 'string' ? task.dueDate : '';
  // If dueDate is ISO, reduce to YYYY-MM-DD for <input type="date">
  const dueForInput = rawDue.includes('T') ? rawDue.slice(0, 10) : rawDue;
  if (taskDueDate) taskDueDate.value = dueForInput;

  const labelSearch = document.getElementById('task-label-search');
  if (labelSearch) labelSearch.value = '';

  updateTaskLabelsSelection();
  modal.classList.remove('hidden');
  taskTitle.focus();
}

function hideModal() {
  const modal = document.getElementById('task-modal');
  modal.classList.add('hidden');
  editingTaskId = null;
}

export function showColumnModal() {
  editingColumnId = null;
  const modal = document.getElementById('column-modal');
  const columnName = document.getElementById('column-name');
  const columnColor = document.getElementById('column-color');
  const modalTitle = document.getElementById('column-modal-title');
  const submitBtn = document.getElementById('column-submit-btn');
  
  modalTitle.textContent = 'Add New Column';
  submitBtn.textContent = 'Add Column';
  columnName.value = '';
  if (columnColor) columnColor.value = '#3b82f6';
  modal.classList.remove('hidden');
  columnName.focus();
}

export function showEditColumnModal(columnId) {
  const columns = loadColumns();
  const column = columns.find(c => c.id === columnId);
  if (!column) return;
  
  editingColumnId = columnId;
  const modal = document.getElementById('column-modal');
  const columnName = document.getElementById('column-name');
  const columnColor = document.getElementById('column-color');
  const modalTitle = document.getElementById('column-modal-title');
  const submitBtn = document.getElementById('column-submit-btn');
  
  modalTitle.textContent = 'Edit Column';
  submitBtn.textContent = 'Save Changes';
  columnName.value = column.name;
  if (columnColor) columnColor.value = column.color || '#3b82f6';
  modal.classList.remove('hidden');
  columnName.focus();
}

function hideColumnModal() {
  const modal = document.getElementById('column-modal');
  modal.classList.add('hidden');
  editingColumnId = null;
}

export function showLabelsModal() {
  renderLabelsList();
  const modal = document.getElementById('labels-modal');
  modal.classList.remove('hidden');
}

function hideLabelsModal() {
  const modal = document.getElementById('labels-modal');
  modal.classList.add('hidden');
}

export function showHelpModal() {
  const modal = document.getElementById('help-modal');
  modal.classList.remove('hidden');
}

function hideHelpModal() {
  const modal = document.getElementById('help-modal');
  modal.classList.add('hidden');
}

function showLabelModal(labelId = null) {
  editingLabelId = labelId;
  const modal = document.getElementById('label-modal');
  const modalTitle = document.getElementById('label-modal-title');
  const nameInput = document.getElementById('label-name');
  const colorInput = document.getElementById('label-color');
  const submitBtn = document.getElementById('label-submit-btn');
  
  if (labelId) {
    const labels = loadLabels();
    const label = labels.find(l => l.id === labelId);
    if (label) {
      modalTitle.textContent = 'Edit Label';
      submitBtn.textContent = 'Update Label';
      nameInput.value = label.name;
      colorInput.value = label.color;
    }
  } else {
    modalTitle.textContent = 'Add Label';
    submitBtn.textContent = 'Add Label';
    nameInput.value = '';
    colorInput.value = '#3b82f6';
  }
  
  modal.classList.remove('hidden');
  nameInput.focus();
}

function hideLabelModal() {
  const modal = document.getElementById('label-modal');
  modal.classList.add('hidden');
  editingLabelId = null;
}

function renderLabelsList() {
  const container = document.getElementById('labels-list');
  container.innerHTML = '';
  
  const labels = loadLabels();
  labels.forEach(label => {
    const labelItem = document.createElement('div');
    labelItem.classList.add('label-item');
    labelItem.style.display = 'flex';
    labelItem.style.alignItems = 'center';
    labelItem.style.justifyContent = 'space-between';

    const labelSpan = document.createElement('span');
    labelSpan.classList.add('task-label');
    labelSpan.style.backgroundColor = label.color;
    labelSpan.textContent = label.name;

    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('label-actions');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '4px';

    const editBtn = document.createElement('button');
    editBtn.classList.add('btn-small');
    const editIcon = document.createElement('span');
    editIcon.dataset.lucide = 'pencil';
    editBtn.appendChild(editIcon);
    editBtn.title = 'Edit label';
    editBtn.addEventListener('click', () => showLabelModal(label.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-small', 'btn-danger');
    const deleteIcon = document.createElement('span');
    deleteIcon.dataset.lucide = 'trash-2';
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.title = 'Delete label';
    deleteBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Delete Label',
        message: `Delete label "${label.name}"? This will remove it from all tasks.`,
        confirmText: 'Delete'
      });
      if (ok) {
        deleteLabel(label.id);
        renderLabelsList();
        const { renderBoard } = await import('./render.js');
        renderBoard();
      }
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    labelItem.appendChild(labelSpan);
    labelItem.appendChild(actionsDiv);
    container.appendChild(labelItem);
  });

  renderIcons();
}

function renderBoardsSelect() {
  const selectEl = document.getElementById('board-select');
  if (!selectEl) return;

  const boards = listBoards();
  const active = getActiveBoardId();
  selectEl.innerHTML = '';

  boards.forEach((b) => {
    const option = document.createElement('option');
    option.value = b.id;
    option.textContent = (typeof b.name === 'string' && b.name.trim()) ? b.name.trim() : 'Untitled board';
    selectEl.appendChild(option);
  });

  if (active) selectEl.value = active;

  const brandEl = document.getElementById('brand-text') || document.querySelector('.brand-text');
  if (brandEl) brandEl.textContent = getActiveBoardName();
}

function renderBoardsList() {
  ensureBoardsInitialized();
  const container = document.getElementById('boards-list');
  if (!container) return;

  container.innerHTML = '';
  const boards = listBoards();
  const activeId = getActiveBoardId();

  boards.forEach((board) => {
    const item = document.createElement('div');
    item.classList.add('label-item');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.gap = '10px';

    const nameWrap = document.createElement('div');
    nameWrap.style.display = 'flex';
    nameWrap.style.alignItems = 'center';
    nameWrap.style.gap = '8px';

    const nameEl = document.createElement('span');
    nameEl.textContent = (board.name || '').toString();
    nameWrap.appendChild(nameEl);

    if (board.id === activeId) {
      const activeBadge = document.createElement('span');
      activeBadge.classList.add('task-label');
      activeBadge.style.backgroundColor = 'var(--color-primary)';
      activeBadge.textContent = 'Active';
      nameWrap.appendChild(activeBadge);
    }

    const actions = document.createElement('div');
    actions.classList.add('label-actions');
    actions.style.display = 'flex';
    actions.style.gap = '4px';

    const switchBtn = document.createElement('button');
    switchBtn.classList.add('btn-small');
    switchBtn.textContent = 'Open';
    switchBtn.title = 'Open board';
    switchBtn.addEventListener('click', async () => {
      setActiveBoardId(board.id);
      renderBoardsSelect();
      renderBoardsList();
      const { renderBoard } = await import('./render.js');
      renderBoard();
    });

    const editBtn = document.createElement('button');
    editBtn.classList.add('btn-small');
    const editIcon = document.createElement('span');
    editIcon.dataset.lucide = 'pencil';
    editBtn.appendChild(editIcon);
    editBtn.title = 'Rename board';
    editBtn.addEventListener('click', () => showBoardRenameModal(board.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-small', 'btn-danger');
    const deleteIcon = document.createElement('span');
    deleteIcon.dataset.lucide = 'trash-2';
    deleteBtn.appendChild(deleteIcon);
    deleteBtn.title = 'Delete board';
    deleteBtn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Delete Board',
        message: `Do you really want to delete the board "${board.name}"? This cannot be undone.`,
        confirmText: 'Delete'
      });
      if (!ok) return;
      const deleted = deleteBoardById(board.id);
      if (!deleted) {
        await alertDialog({
          title: 'Unable to Delete',
          message: 'Unable to delete board (you may be trying to delete the last board).'
        });
        return;
      }
      renderBoardsSelect();
      renderBoardsList();
      const { renderBoard } = await import('./render.js');
      renderBoard();
    });

    actions.appendChild(switchBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(nameWrap);
    item.appendChild(actions);
    container.appendChild(item);
  });

  renderIcons();
}

function showBoardsModal() {
  renderBoardsList();
  const modal = document.getElementById('boards-modal');
  modal?.classList.remove('hidden');
}

function hideBoardsModal() {
  const modal = document.getElementById('boards-modal');
  modal?.classList.add('hidden');
}

function showBoardRenameModal(boardId) {
  ensureBoardsInitialized();
  const board = listBoards().find((b) => b.id === boardId);
  if (!board) return;

  editingBoardId = boardId;
  const modal = document.getElementById('board-rename-modal');
  const input = document.getElementById('board-rename-name');
  const title = document.getElementById('board-rename-modal-title');
  const submitBtn = document.getElementById('board-rename-submit-btn');

  if (title) title.textContent = 'Rename Board';
  if (submitBtn) submitBtn.textContent = 'Save';
  if (input) input.value = (board.name || '').toString();

  modal?.classList.remove('hidden');
  input?.focus();
}

function hideBoardRenameModal() {
  const modal = document.getElementById('board-rename-modal');
  modal?.classList.add('hidden');
  editingBoardId = null;
}

function updateTaskLabelsSelection() {
  renderActiveTaskLabels();
  const container = document.getElementById('task-labels-selection');
  container.innerHTML = '';
  
  const query = getTaskLabelSearchQuery();
  const labels = loadLabels();
  const filteredLabels = query
    ? labels.filter(label => {
        const name = (label.name || '').toLowerCase();
        const id = (label.id || '').toLowerCase();
        return name.includes(query) || id.includes(query);
      })
    : labels;

  if (filteredLabels.length === 0) {
    const empty = document.createElement('div');
    empty.classList.add('labels-empty');
    empty.textContent = 'No matching labels';
    container.appendChild(empty);
    return;
  }

  filteredLabels.forEach(label => {
    const labelEl = document.createElement('label');
    labelEl.classList.add('label-checkbox');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = label.id;
    checkbox.checked = selectedTaskLabels.includes(label.id);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        if (!selectedTaskLabels.includes(label.id)) selectedTaskLabels.push(label.id);
      } else {
        selectedTaskLabels = selectedTaskLabels.filter(id => id !== label.id);
      }
      renderActiveTaskLabels();
    });
    
    const labelPill = document.createElement('span');
    labelPill.classList.add('task-label', 'label-color-swatch');
    labelPill.style.backgroundColor = label.color;
    labelPill.textContent = label.name;
    
    labelEl.appendChild(checkbox);
    labelEl.appendChild(labelPill);
    container.appendChild(labelEl);
  });
}

export function initializeModalHandlers() {
  const taskLabelSearch = document.getElementById('task-label-search');
  taskLabelSearch?.addEventListener('input', updateTaskLabelsSelection);

  // Task modal
  document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority')?.value;
    const dueDate = document.getElementById('task-due-date')?.value;
    const column = document.getElementById('task-column').value;
    
    if (editingTaskId) {
      updateTask(editingTaskId, title, description, priority, dueDate, column, selectedTaskLabels);
    } else {
      addTask(title, description, priority, dueDate, column, selectedTaskLabels);
    }
    hideModal();
    const { renderBoard } = await import('./render.js');
    renderBoard();
  });

  document.getElementById('cancel-task-btn').addEventListener('click', hideModal);
  document.querySelector('#task-modal .modal-backdrop').addEventListener('click', hideModal);

  // Column modal
  document.getElementById('column-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('column-name').value;
    const color = document.getElementById('column-color')?.value;
    
    if (editingColumnId) {
      updateColumn(editingColumnId, name, color);
    } else {
      addColumn(name, color);
    }
    hideColumnModal();
    const { renderBoard } = await import('./render.js');
    renderBoard();
  });

  document.getElementById('cancel-column-btn').addEventListener('click', hideColumnModal);
  document.querySelector('#column-modal .modal-backdrop').addEventListener('click', hideColumnModal);

  // Labels modal
  document.getElementById('manage-labels-btn').addEventListener('click', showLabelsModal);
  document.getElementById('labels-close-btn').addEventListener('click', hideLabelsModal);
  document.getElementById('add-label-btn').addEventListener('click', () => showLabelModal());
  
  document.getElementById('label-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('label-name').value;
    const color = document.getElementById('label-color').value;
    
    if (editingLabelId) {
      updateLabel(editingLabelId, name, color);
    } else {
      addLabel(name, color);
    }
    hideLabelModal();
    renderLabelsList();
    const { renderBoard } = await import('./render.js');
    renderBoard();
  });
  
  document.getElementById('cancel-label-btn').addEventListener('click', hideLabelModal);
  document.querySelector('#labels-modal .modal-backdrop').addEventListener('click', hideLabelsModal);
  document.querySelector('#label-modal .modal-backdrop').addEventListener('click', hideLabelModal);

  // Boards modal
  document.getElementById('manage-boards-btn')?.addEventListener('click', showBoardsModal);
  document.getElementById('boards-close-btn')?.addEventListener('click', hideBoardsModal);
  document.querySelector('#boards-modal .modal-backdrop')?.addEventListener('click', hideBoardsModal);

  // Board rename modal
  document.getElementById('board-rename-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!editingBoardId) return;

    const input = document.getElementById('board-rename-name');
    const name = (input?.value || '').trim();
    if (!name) {
      alert('Board name cannot be empty.');
      return;
    }

    if (!renameBoard(editingBoardId, name)) {
      alert('Unable to rename board.');
      return;
    }

    hideBoardRenameModal();
    renderBoardsSelect();
    renderBoardsList();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });

  document.getElementById('cancel-board-rename-btn')?.addEventListener('click', hideBoardRenameModal);
  document.querySelector('#board-rename-modal .modal-backdrop')?.addEventListener('click', hideBoardRenameModal);

  // Help modal
  document.getElementById('help-btn').addEventListener('click', showHelpModal);
  document.getElementById('help-close-btn').addEventListener('click', hideHelpModal);
  document.querySelector('#help-modal .modal-backdrop').addEventListener('click', hideHelpModal);

  // Add column button
  document.getElementById('add-column-btn').addEventListener('click', showColumnModal);

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
      hideColumnModal();
      hideLabelsModal();
      hideLabelModal();
      hideBoardsModal();
      hideBoardRenameModal();
      hideHelpModal();
    }
  });
}

export { updateTaskLabelsSelection };
