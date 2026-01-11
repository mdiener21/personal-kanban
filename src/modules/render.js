import { loadColumns, loadTasks, loadLabels, loadSettings } from './storage.js';
import { deleteTask } from './tasks.js';
import { deleteColumn } from './columns.js';
import { showModal, showEditModal, showEditColumnModal } from './modals.js';
import { initDragDrop } from './dragdrop.js';
import { confirmDialog, alertDialog } from './dialog.js';
import { renderIcons } from './icons.js';

let columnMenuCloseHandlerAttached = false;

let boardFilterQuery = '';

export function setBoardFilterQuery(query) {
  boardFilterQuery = (query || '').toString();
}

function taskMatchesFilter(task, queryLower, labelsById) {
  if (!queryLower) return true;

  const legacyTitle = typeof task?.text === 'string' ? task.text : '';
  const title = (typeof task?.title === 'string' && task.title.trim() !== '') ? task.title : legacyTitle;
  const description = typeof task?.description === 'string' ? task.description : '';
  const priority = typeof task?.priority === 'string' ? task.priority : '';

  if (title.toLowerCase().includes(queryLower)) return true;
  if (description.toLowerCase().includes(queryLower)) return true;
  if (priority.toLowerCase().includes(queryLower)) return true;

  const labelIds = Array.isArray(task?.labels) ? task.labels : [];
  for (const id of labelIds) {
    const name = labelsById.get(id);
    if (name && name.includes(queryLower)) return true;
  }

  return false;
}

function closeAllColumnMenus(exceptMenu = null) {
  document.querySelectorAll('.column-menu').forEach((menu) => {
    if (exceptMenu && menu === exceptMenu) return;
    menu.classList.add('hidden');
  });
}

function formatDisplayDate(value, locale) {
  const raw = (value || '').toString().trim();
  if (!raw) return '';

  const dateForParse = raw.includes('T') ? raw : `${raw}T00:00:00`;
  const parsed = new Date(dateForParse);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString(locale || undefined);
}

function formatDisplayDateTime(value, locale) {
  const raw = (value || '').toString().trim();
  if (!raw) return '';

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString(locale || undefined);
}

function formatTaskAge(task) {
  const createdRaw = (task?.creationDate || '').toString().trim();
  if (!createdRaw) return '';

  const created = new Date(createdRaw);
  if (Number.isNaN(created.getTime())) return '';

  const ageMs = Date.now() - created.getTime();
  const ageDays = Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000)));

  if (ageDays >= 30) {
    const months = Math.max(1, Math.floor(ageDays / 30));
    return `${months}M`;
  }

  return `${ageDays}d`;
}

// Create a task element
function createTaskElement(task, settings) {
  const li = document.createElement('li');
  li.classList.add('task');
  li.draggable = true;
  li.dataset.taskId = task.id;
  li.setAttribute('role', 'listitem');
  li.setAttribute('aria-label', `Task: ${task.title || task.text || 'Untitled'}`);
  
  // Labels container
  const labelsContainer = document.createElement('div');
  labelsContainer.classList.add('task-labels');
  labelsContainer.setAttribute('role', 'list');
  labelsContainer.setAttribute('aria-label', 'Task labels');
  
  const labels = loadLabels();
  if (task.labels && task.labels.length > 0) {
    task.labels.forEach(labelId => {
      const label = labels.find(l => l.id === labelId);
      if (label) {
        const labelEl = document.createElement('span');
        labelEl.classList.add('task-label');
        labelEl.setAttribute('role', 'listitem');
        labelEl.style.backgroundColor = label.color;
        labelEl.textContent = label.name;
        labelsContainer.appendChild(labelEl);
      }
    });
  }
  
  const header = document.createElement('div');
  header.classList.add('task-header');

  const titleEl = document.createElement('div');
  titleEl.classList.add('task-title');
  titleEl.setAttribute('role', 'button');
  titleEl.setAttribute('tabindex', '0');
  const legacyTitle = typeof task.text === 'string' ? task.text : '';
  titleEl.textContent = (typeof task.title === 'string' && task.title.trim() !== '') ? task.title : legacyTitle;
  titleEl.addEventListener('click', () => showEditModal(task.id));
  titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showEditModal(task.id);
    }
  });

  const actions = document.createElement('div');
  actions.classList.add('task-actions');

  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-task-btn');
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.type = 'button';
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'trash-2';
  deleteIcon.setAttribute('aria-hidden', 'true');
  deleteBtn.appendChild(deleteIcon);
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const ok = await confirmDialog({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete'
    });
    if (!ok) return;
    if (deleteTask(task.id)) renderBoard();
  });

  actions.appendChild(deleteBtn);
  header.appendChild(titleEl);
  header.appendChild(actions);

  const descriptionValue = typeof task.description === 'string' ? task.description.trim() : '';
  const descriptionEl = document.createElement('div');
  descriptionEl.classList.add('task-description');
  descriptionEl.textContent = descriptionValue;
  descriptionEl.style.display = descriptionValue ? 'block' : 'none';
  descriptionEl.addEventListener('click', () => showEditModal(task.id));

  const meta = document.createElement('div');
  meta.classList.add('task-meta');

  const priority = typeof task.priority === 'string' ? task.priority : 'medium';
  const priorityEl = document.createElement('span');
  priorityEl.classList.add('task-priority', `priority-${priority}`);
  priorityEl.textContent = priority;
  priorityEl.setAttribute('aria-label', `Priority: ${priority}`);

  const dueDateRaw = typeof task.dueDate === 'string' ? task.dueDate.trim() : '';
  const dueDateEl = document.createElement('span');
  dueDateEl.classList.add('task-date');
  if (!dueDateRaw) {
    dueDateEl.textContent = 'No due date';
  } else {
    dueDateEl.textContent = formatDisplayDate(dueDateRaw, settings?.locale);
  }

  meta.appendChild(priorityEl);
  meta.appendChild(dueDateEl);

  li.appendChild(header);
  li.appendChild(descriptionEl);
  li.appendChild(labelsContainer);
  li.appendChild(meta);

  const showChangeDate = settings?.showChangeDate !== false;
  const showAge = settings?.showAge !== false;
  const locale = settings?.locale;

  const footer = document.createElement('div');
  footer.classList.add('task-footer');

  if (showChangeDate) {
    const changeDateEl = document.createElement('span');
    changeDateEl.classList.add('task-change-date');
    const changeDisplay = formatDisplayDateTime(task?.changeDate, locale);
    changeDateEl.textContent = changeDisplay ? `Updated ${changeDisplay}` : '';
    footer.appendChild(changeDateEl);
  }

  if (showAge) {
    const ageEl = document.createElement('span');
    ageEl.classList.add('task-age');
    const ageText = formatTaskAge(task);
    ageEl.textContent = ageText ? `Age ${ageText}` : '';
    footer.appendChild(ageEl);
  }

  const hasFooterContent = Array.from(footer.childNodes).some((n) => (n.textContent || '').trim() !== '');
  if (hasFooterContent) li.appendChild(footer);
  
  return li;
}

// Create a column element
function createColumnElement(column) {
  const div = document.createElement('article');
  div.classList.add('task-column');
  div.dataset.column = column.id;
  div.draggable = false;
  div.setAttribute('aria-labelledby', `column-title-${column.id}`);

  if (column?.color) {
    div.style.setProperty('--column-accent', column.color);
  }
  
  const dragHandle = document.createElement('button');
  dragHandle.classList.add('column-drag-handle');
  dragHandle.type = 'button';
  dragHandle.setAttribute('aria-label', 'Drag to reorder column');
  const gripIcon = document.createElement('span');
  gripIcon.dataset.lucide = 'grip-vertical';
  gripIcon.setAttribute('aria-hidden', 'true');
  dragHandle.appendChild(gripIcon);
  dragHandle.title = 'Drag to reorder';
  
  const headerDiv = document.createElement('header');
  headerDiv.classList.add('column-header');
  
  const h2 = document.createElement('h2');
  h2.id = `column-title-${column.id}`;
  h2.textContent = column.name;
  
  const taskCounter = document.createElement('span');
  taskCounter.classList.add('task-counter');
  taskCounter.dataset.columnId = column.id;
  taskCounter.textContent = '0';
  taskCounter.setAttribute('aria-label', 'Task count');
  
  const headerActions = document.createElement('div');
  headerActions.classList.add('column-actions');
  
  const addBtn = document.createElement('button');
  addBtn.classList.add('add-task-btn-icon');
  addBtn.type = 'button';
  addBtn.setAttribute('aria-label', `Add task to ${column.name}`);
  const plusIcon = document.createElement('span');
  plusIcon.dataset.lucide = 'plus';
  plusIcon.setAttribute('aria-hidden', 'true');
  addBtn.appendChild(plusIcon);
  addBtn.title = 'Add task';
  addBtn.addEventListener('click', () => showModal(column.id));

  // Overflow menu: ellipsis-vertical -> (pencil, trash)
  const menuWrapper = document.createElement('div');
  menuWrapper.classList.add('column-menu-wrapper');

  const menuBtn = document.createElement('button');
  menuBtn.classList.add('column-menu-btn');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-haspopup', 'menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', `${column.name} column menu`);
  const menuIcon = document.createElement('span');
  menuIcon.dataset.lucide = 'ellipsis-vertical';
  menuIcon.setAttribute('aria-hidden', 'true');
  menuBtn.appendChild(menuIcon);
  menuBtn.title = 'Column menu';

  const menu = document.createElement('div');
  menu.classList.add('column-menu', 'hidden');
  menu.setAttribute('role', 'menu');

  const editColBtn = document.createElement('button');
  editColBtn.classList.add('column-menu-item');
  editColBtn.type = 'button';
  editColBtn.setAttribute('role', 'menuitem');
  const editIcon = document.createElement('span');
  editIcon.dataset.lucide = 'pencil';
  editIcon.setAttribute('aria-hidden', 'true');
  editColBtn.appendChild(editIcon);
  const editText = document.createTextNode(' Edit');
  editColBtn.appendChild(editText);
  editColBtn.title = 'Edit column';
  editColBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllColumnMenus();
    showEditColumnModal(column.id);
  });

  const deleteColBtn = document.createElement('button');
  deleteColBtn.classList.add('column-menu-item', 'danger');
  deleteColBtn.type = 'button';
  deleteColBtn.setAttribute('role', 'menuitem');
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'trash-2';
  deleteIcon.setAttribute('aria-hidden', 'true');
  deleteColBtn.appendChild(deleteIcon);
  const deleteText = document.createTextNode(' Delete');
  deleteColBtn.appendChild(deleteText);
  deleteColBtn.title = 'Delete column';
  deleteColBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllColumnMenus();
    (async () => {
      const columns = loadColumns();
      if (columns.length <= 1) {
        await alertDialog({ title: 'Cannot Delete Column', message: 'Cannot delete the last column.' });
        return;
      }

      const tasks = loadTasks();
      const tasksInColumn = tasks.filter((t) => t.column === column.id);
      const colName = column?.name ? `"${column.name}"` : 'this column';
      const message = tasksInColumn.length > 0
        ? `Delete ${colName}? This will also delete ${tasksInColumn.length} task(s).`
        : `Delete ${colName}?`;

      const ok = await confirmDialog({ title: 'Delete Column', message, confirmText: 'Delete' });
      if (!ok) return;
      if (deleteColumn(column.id)) renderBoard();
    })();
  });

  menu.appendChild(editColBtn);
  menu.appendChild(deleteColBtn);

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !menu.classList.contains('hidden');
    closeAllColumnMenus();
    if (!isOpen) {
      menu.classList.remove('hidden');
      menuBtn.setAttribute('aria-expanded', 'true');
    } else {
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  menuWrapper.appendChild(menuBtn);
  menuWrapper.appendChild(menu);

  headerActions.appendChild(addBtn);
  headerActions.appendChild(menuWrapper);
  
  headerDiv.appendChild(dragHandle);
  headerDiv.appendChild(h2);
  headerDiv.appendChild(taskCounter);
  headerDiv.appendChild(headerActions);
  
  const ul = document.createElement('ul');
  ul.classList.add('tasks');
  ul.setAttribute('role', 'list');
  ul.setAttribute('aria-label', `Tasks in ${column.name}`);
  
  div.appendChild(headerDiv);
  div.appendChild(ul);
  
  return div;
}

// Update the column select dropdown
function updateColumnSelect() {
  const columns = loadColumns();
  const select = document.getElementById('task-column');
  select.innerHTML = '';
  columns.forEach(col => {
    const option = document.createElement('option');
    option.value = col.id;
    option.textContent = col.name;
    select.appendChild(option);
  });
}

// Render all columns and tasks
export function renderBoard() {
  const columns = loadColumns();
  const tasks = loadTasks();
  const labels = loadLabels();
  const settings = loadSettings();
  const labelsById = new Map(labels.map((l) => [l.id, (l.name || '').toString().trim().toLowerCase()]));
  const queryLower = (boardFilterQuery || '').toString().trim().toLowerCase();
  const visibleTasks = queryLower
    ? tasks.filter((t) => taskMatchesFilter(t, queryLower, labelsById))
    : tasks;
  const container = document.getElementById('board-container');
  container.innerHTML = '';
  
  // Sort columns by order if present
  const sortedColumns = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  sortedColumns.forEach(column => {
    const columnEl = createColumnElement(column);
    container.appendChild(columnEl);
    
    const tasksList = columnEl.querySelector('.tasks');
    const taskCounter = columnEl.querySelector('.task-counter');
    // Sort tasks by order within each column
    const columnTasks = visibleTasks.filter(t => t.column === column.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    columnTasks.forEach(task => {
      tasksList.appendChild(createTaskElement(task, settings));
    });
    
    // Update task counter
    taskCounter.textContent = columnTasks.length;
    
  });
  
  initDragDrop();
  updateColumnSelect();

  // Re-render icons for dynamically created elements
  renderIcons();

  if (!columnMenuCloseHandlerAttached) {
    columnMenuCloseHandlerAttached = true;
    document.addEventListener('click', () => closeAllColumnMenus());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllColumnMenus();
    });
  }
}
