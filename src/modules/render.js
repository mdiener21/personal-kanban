import { loadColumns, loadTasks, loadLabels, loadSettings, saveTasks } from './storage.js';
import { deleteTask } from './tasks.js';
import { deleteColumn, toggleColumnCollapsed } from './columns.js';
import { showModal, showEditModal, showEditColumnModal } from './modals.js';
import { initDragDrop } from './dragdrop.js';
import { confirmDialog, alertDialog } from './dialog.js';
import { renderIcons } from './icons.js';
import { refreshNotifications } from './notifications.js';
import { calculateDaysUntilDue, formatCountdown, getCountdownClassName } from './dateutils.js';

let columnMenuCloseHandlerAttached = false;
let taskInteractionHandlersAttached = false;
let columnInteractionHandlersAttached = false;
let columnMenuInteractionHandlersAttached = false;

let boardFilterQuery = '';

// Done column virtualization state
const DONE_INITIAL_BATCH_SIZE = 50;
const DONE_LOAD_MORE_SIZE = 50;
let doneVisibleCount = DONE_INITIAL_BATCH_SIZE;

const TASK_OPEN_TRIGGER_SELECTOR = '.task-title, .task-description, .task-priority-header';
const TASK_KEYBOARD_OPEN_SELECTOR = '.task-title, .task-priority-header';
const COLUMN_MENU_ACTION_TOGGLE_SORT = 'toggle-sort';

export function setBoardFilterQuery(query) {
  boardFilterQuery = (query || '').toString();
}

function getTaskIdFromEventTarget(target) {
  const taskEl = target?.closest?.('.task');
  return taskEl?.dataset?.taskId || '';
}

async function confirmAndDeleteTask(taskId) {
  const ok = await confirmDialog({
    title: 'Delete Task',
    message: 'Are you sure you want to delete this task?',
    confirmText: 'Delete'
  });
  if (!ok) return;
  if (deleteTask(taskId)) renderBoard();
}

function handleTaskInteractionClick(event) {
  const deleteBtn = event.target.closest('.delete-task-btn');
  if (deleteBtn) {
    event.stopPropagation();
    const taskId = getTaskIdFromEventTarget(deleteBtn);
    if (!taskId) return;
    void confirmAndDeleteTask(taskId);
    return;
  }

  const openTrigger = event.target.closest(TASK_OPEN_TRIGGER_SELECTOR);
  if (!openTrigger) return;

  const taskId = getTaskIdFromEventTarget(openTrigger);
  if (!taskId) return;
  showEditModal(taskId);
}

function handleTaskInteractionKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  const openTrigger = event.target.closest(TASK_KEYBOARD_OPEN_SELECTOR);
  if (!openTrigger) return;

  event.preventDefault();
  const taskId = getTaskIdFromEventTarget(openTrigger);
  if (!taskId) return;
  showEditModal(taskId);
}

function ensureTaskInteractionHandlers() {
  if (taskInteractionHandlersAttached) return;

  const container = document.getElementById('board-container');
  if (!container) return;

  taskInteractionHandlersAttached = true;

  container.addEventListener('click', handleTaskInteractionClick);
  container.addEventListener('keydown', handleTaskInteractionKeydown);
}

function getColumnIdFromEventTarget(target) {
  const columnEl = target?.closest?.('.task-column');
  return columnEl?.dataset?.column || '';
}

function handleColumnInteractionClick(event) {
  const addBtn = event.target.closest('.add-task-btn-icon');
  if (addBtn) {
    event.stopPropagation();
    const columnId = getColumnIdFromEventTarget(addBtn);
    if (!columnId) return;
    showModal(columnId);
    return;
  }

  const collapseBtn = event.target.closest('.column-collapse-btn');
  if (!collapseBtn) return;

  event.stopPropagation();
  const columnId = getColumnIdFromEventTarget(collapseBtn);
  if (!columnId) return;
  if (toggleColumnCollapsed(columnId)) renderBoard();
}

function ensureColumnInteractionHandlers() {
  if (columnInteractionHandlersAttached) return;

  const container = document.getElementById('board-container');
  if (!container) return;

  columnInteractionHandlersAttached = true;

  container.addEventListener('click', handleColumnInteractionClick);
}

function buildTaskCountByColumn(tasks) {
  const counts = new Map();
  tasks.forEach((task) => {
    const columnId = task?.column;
    if (!columnId) return;
    counts.set(columnId, (counts.get(columnId) || 0) + 1);
  });
  return counts;
}

function buildTasksByColumn(tasks) {
  const tasksByColumn = new Map();
  tasks.forEach((task) => {
    const columnId = task?.column;
    if (!columnId) return;
    if (!tasksByColumn.has(columnId)) tasksByColumn.set(columnId, []);
    tasksByColumn.get(columnId).push(task);
  });
  return tasksByColumn;
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
    const label = labelsById.get(id);
    if (!label) continue;
    if (label.name.includes(queryLower)) return true;
    if (label.group.includes(queryLower)) return true;
  }

  return false;
}

function closeAllColumnMenus(exceptMenu = null) {
  document.querySelectorAll('.column-menu').forEach((menu) => {
    if (exceptMenu && menu === exceptMenu) return;
    menu.classList.add('hidden');
  });
  document.querySelectorAll('.column-menu-btn').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
  });
  // Also close any open submenus
  document.querySelectorAll('.column-submenu').forEach((submenu) => {
    submenu.classList.add('hidden');
  });
  document.querySelectorAll('.column-menu-item.has-submenu').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

async function handleDeleteColumnAction(columnId) {
  if (columnId === 'done') {
    await alertDialog({ title: 'Cannot Delete Column', message: 'The Done column is permanent and cannot be deleted.' });
    return;
  }

  const columns = loadColumns();
  if (columns.length <= 1) {
    await alertDialog({ title: 'Cannot Delete Column', message: 'Cannot delete the last column.' });
    return;
  }

  const column = columns.find((c) => c.id === columnId);
  const tasks = loadTasks();
  const tasksInColumn = tasks.filter((t) => t.column === columnId);
  const colName = column?.name ? `"${column.name}"` : 'this column';
  const message = tasksInColumn.length > 0
    ? `Delete ${colName}? This will also delete ${tasksInColumn.length} task(s).`
    : `Delete ${colName}?`;

  const ok = await confirmDialog({ title: 'Delete Column', message, confirmText: 'Delete' });
  if (!ok) return;
  if (deleteColumn(columnId)) renderBoard();
}

function toggleColumnMenu(menuBtn) {
  const menuWrapper = menuBtn.closest('.column-menu-wrapper');
  const menu = menuWrapper?.querySelector('.column-menu');
  if (!menu) return;

  const isOpen = !menu.classList.contains('hidden');
  closeAllColumnMenus(menu);
  if (isOpen) {
    menu.classList.add('hidden');
    menuBtn.setAttribute('aria-expanded', 'false');
  } else {
    menu.classList.remove('hidden');
    menuBtn.setAttribute('aria-expanded', 'true');
  }
}

function toggleSortSubmenu(sortToggleBtn) {
  const sortWrapper = sortToggleBtn.closest('.column-menu-submenu-wrapper');
  const sortSubmenu = sortWrapper?.querySelector('.column-submenu');
  if (!sortSubmenu) return;

  const isExpanded = !sortSubmenu.classList.contains('hidden');
  sortSubmenu.classList.toggle('hidden');
  sortToggleBtn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
}

function handleColumnMenuAction(action, columnId) {
  if (!columnId) return;

  const columnMenuActionHandlers = {
    edit: () => {
      closeAllColumnMenus();
      showEditColumnModal(columnId);
    },
    'sort-due-date': () => {
      closeAllColumnMenus();
      sortColumnTasks(columnId, 'dueDate');
    },
    'sort-priority': () => {
      closeAllColumnMenus();
      sortColumnTasks(columnId, 'priority');
    },
    delete: () => {
      closeAllColumnMenus();
      void handleDeleteColumnAction(columnId);
    }
  };

  const actionHandler = columnMenuActionHandlers[action];
  if (!actionHandler) return;
  actionHandler();
}

function handleColumnMenuInteractionClick(event) {
  const menuBtn = event.target.closest('.column-menu-btn');
  if (menuBtn) {
    event.stopPropagation();
    toggleColumnMenu(menuBtn);
    return;
  }

  const sortToggleBtn = event.target.closest(`[data-column-menu-action="${COLUMN_MENU_ACTION_TOGGLE_SORT}"]`);
  if (sortToggleBtn) {
    event.stopPropagation();
    toggleSortSubmenu(sortToggleBtn);
    return;
  }

  const actionBtn = event.target.closest('[data-column-menu-action]');
  if (!actionBtn) return;

  const action = actionBtn.dataset.columnMenuAction;
  if (!action || action === COLUMN_MENU_ACTION_TOGGLE_SORT) return;

  event.stopPropagation();
  const columnId = getColumnIdFromEventTarget(actionBtn);
  handleColumnMenuAction(action, columnId);
}

function ensureColumnMenuInteractionHandlers() {
  if (columnMenuInteractionHandlersAttached) return;

  const container = document.getElementById('board-container');
  if (!container) return;

  columnMenuInteractionHandlersAttached = true;

  container.addEventListener('click', handleColumnMenuInteractionClick);
}

/**
 * Sort tasks by due date (ascending).
 * Tasks without due dates are placed at the end.
 */
function sortTasksByDueDate(tasks) {
  return [...tasks].sort((a, b) => {
    const dateA = (a.dueDate || '').toString().trim();
    const dateB = (b.dueDate || '').toString().trim();

    // Tasks without due date go to the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    // Compare dates (YYYY-MM-DD format sorts correctly as strings)
    return dateA.localeCompare(dateB);
  });
}

/**
 * Sort tasks by priority (descending: urgent → high → medium → low → none).
 */
function sortTasksByPriority(tasks) {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
  return [...tasks].sort((a, b) => {
    const prioA = priorityOrder[a.priority] ?? 4;
    const prioB = priorityOrder[b.priority] ?? 4;
    return prioA - prioB;
  });
}

/**
 * Apply sorting to tasks in a specific column and persist.
 * @param {string} columnId - The column to sort
 * @param {'dueDate'|'priority'} sortBy - Sort criteria
 */
function sortColumnTasks(columnId, sortBy) {
  const tasks = loadTasks();

  // Get tasks in this column
  const columnTasks = tasks.filter((t) => t.column === columnId);
  const otherTasks = tasks.filter((t) => t.column !== columnId);

  // Sort the column's tasks
  const sortedColumnTasks =
    sortBy === 'dueDate' ? sortTasksByDueDate(columnTasks) : sortTasksByPriority(columnTasks);

  // Update order property (1-based)
  const updatedColumnTasks = sortedColumnTasks.map((task, index) => ({
    ...task,
    order: index + 1
  }));

  // Combine and save
  const updatedTasks = [...otherTasks, ...updatedColumnTasks];
  saveTasks(updatedTasks);

  // Re-render the board
  renderBoard();
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

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - created.getTime()) / MS_PER_DAY)
  );

  // Less than 1 month → days only
  if (ageDays < 30) {
    return `${ageDays}d`;
  }

  const years = Math.floor(ageDays / 365);
  let remainingDays = ageDays % 365;

  const months = Math.floor(remainingDays / 30);
  remainingDays = remainingDays % 30;

  const parts = [];

  if (years >= 1) {
    parts.push(`${years}y`);
  }

  if (months >= 1) {
    parts.push(`${months}M`);
  }

  parts.push(`${remainingDays}d`);

  return parts.join(' ');
}


// Create a task element
function createTaskElement(task, settings, labelsMap = null, today = null) {
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
  
  // Use pre-loaded labels map for performance
  const labels = labelsMap || new Map(loadLabels().map(l => [l.id, l]));
  if (task.labels && task.labels.length > 0) {
    task.labels.forEach(labelId => {
      const label = labels instanceof Map ? labels.get(labelId) : labels.find(l => l.id === labelId);
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

  const showPriority = settings?.showPriority !== false;
  const showDueDate = settings?.showDueDate !== false;

  const titleEl = document.createElement('div');
  titleEl.classList.add('task-title');
  titleEl.setAttribute('role', 'button');
  titleEl.setAttribute('tabindex', '0');
  const legacyTitle = typeof task.text === 'string' ? task.text : '';
  titleEl.textContent = (typeof task.title === 'string' && task.title.trim() !== '') ? task.title : legacyTitle;

  const actions = document.createElement('div');
  actions.classList.add('task-actions');

  if (showPriority) {
    const rawPriority = typeof task.priority === 'string' ? task.priority.toLowerCase().trim() : '';
    const priority = (rawPriority === 'urgent' || rawPriority === 'high' || rawPriority === 'medium' || rawPriority === 'low' || rawPriority === 'none')
      ? rawPriority
      : 'none';
    const priorityEl = document.createElement('span');
    priorityEl.classList.add('task-priority', `priority-${priority}`, 'task-priority-header');
    priorityEl.textContent = priority;
    priorityEl.setAttribute('aria-label', `Priority: ${priority}`);
    priorityEl.setAttribute('role', 'button');
    priorityEl.setAttribute('tabindex', '0');
    priorityEl.title = 'Edit task';
    actions.appendChild(priorityEl);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-task-btn');
  deleteBtn.setAttribute('aria-label', 'Delete task');
  deleteBtn.type = 'button';
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'trash-2';
  deleteIcon.setAttribute('aria-hidden', 'true');
  deleteBtn.appendChild(deleteIcon);

  actions.appendChild(deleteBtn);
  header.appendChild(titleEl);
  header.appendChild(actions);

  const descriptionValue = typeof task.description === 'string' ? task.description.trim() : '';
  const descriptionEl = document.createElement('div');
  descriptionEl.classList.add('task-description');
  descriptionEl.textContent = descriptionValue;
  descriptionEl.style.display = descriptionValue ? 'block' : 'none';

  li.appendChild(header);
  li.appendChild(descriptionEl);
  li.appendChild(labelsContainer);

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

  // Bottom row: due date + age
  const footerRow = document.createElement('div');
  footerRow.classList.add('task-footer-row');

  if (showDueDate) {
    const dueDateRaw = typeof task.dueDate === 'string' ? task.dueDate.trim() : '';
    const dueDateEl = document.createElement('span');
    dueDateEl.classList.add('task-date');

    if (!dueDateRaw) {
      dueDateEl.textContent = 'No due date';
      dueDateEl.classList.add('countdown-none');
    } else {
      const formattedDate = formatDisplayDate(dueDateRaw, settings?.locale);
      const daysUntilDue = calculateDaysUntilDue(dueDateRaw, today);

      if (daysUntilDue !== null) {
        const countdown = formatCountdown(daysUntilDue);
        const urgentThreshold = settings?.countdownUrgentThreshold ?? 3;
        const warningThreshold = settings?.countdownWarningThreshold ?? 10;
        const countdownClass = getCountdownClassName(daysUntilDue, urgentThreshold, warningThreshold);
        dueDateEl.textContent = `Due ${formattedDate} (${countdown})`;
        dueDateEl.classList.add(countdownClass);
      } else {
        // Invalid date, show as-is
        dueDateEl.textContent = 'Due ' + formattedDate;
        dueDateEl.classList.add('countdown-none');
      }
    }

    footerRow.appendChild(dueDateEl);
  }

  if (showAge) {
    const ageEl = document.createElement('span');
    ageEl.classList.add('task-age');
    const ageText = formatTaskAge(task);
    ageEl.textContent = ageText ? `Age ${ageText}` : '';
    footerRow.appendChild(ageEl);
  }

  const hasFooterRowContent = Array.from(footerRow.childNodes).some((n) => (n.textContent || '').trim() !== '');
  if (hasFooterRowContent) footer.appendChild(footerRow);

  const hasFooterContent = Array.from(footer.childNodes).some((n) => (n.textContent || '').trim() !== '');
  if (hasFooterContent) li.appendChild(footer);
  
  return li;
}

// Create a column element
function createColumnElement(column, taskCount = 0) {
  const div = document.createElement('article');
  div.classList.add('task-column');
  div.dataset.column = column.id;
  div.draggable = false;
  div.setAttribute('aria-labelledby', `column-title-${column.id}`);

  const isCollapsed = column?.collapsed === true;
  if (isCollapsed) div.classList.add('is-collapsed');

  if (column?.color) {
    div.style.setProperty('--column-accent', column.color);
  }
  
  const collapseBtn = document.createElement('button');
  collapseBtn.classList.add('column-collapse-btn');
  collapseBtn.type = 'button';
  collapseBtn.setAttribute('aria-label', isCollapsed ? `Expand ${column.name} column` : `Collapse ${column.name} column`);
  collapseBtn.title = isCollapsed ? 'Expand column' : 'Collapse column';
  const collapseIcon = document.createElement('span');
  collapseIcon.dataset.lucide = isCollapsed ? 'chevron-right' : 'chevrons-right-left';
  collapseIcon.setAttribute('aria-hidden', 'true');
  collapseBtn.appendChild(collapseIcon);

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
  if (isCollapsed) {
    h2.textContent = `${column.name} (${taskCount})`;
  } else {
    h2.textContent = column.name;
  }
  
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
  editColBtn.dataset.columnMenuAction = 'edit';
  const editIcon = document.createElement('span');
  editIcon.dataset.lucide = 'pencil';
  editIcon.setAttribute('aria-hidden', 'true');
  editColBtn.appendChild(editIcon);
  const editText = document.createTextNode(' Edit');
  editColBtn.appendChild(editText);
  editColBtn.title = 'Edit column';

  const deleteColBtn = document.createElement('button');
  deleteColBtn.classList.add('column-menu-item', 'danger');
  deleteColBtn.type = 'button';
  deleteColBtn.setAttribute('role', 'menuitem');
  deleteColBtn.dataset.columnMenuAction = 'delete';
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'trash-2';
  deleteIcon.setAttribute('aria-hidden', 'true');
  deleteColBtn.appendChild(deleteIcon);
  const deleteText = document.createTextNode(' Delete');
  deleteColBtn.appendChild(deleteText);
  deleteColBtn.title = 'Delete column';

  // Sort submenu wrapper
  const sortWrapper = document.createElement('div');
  sortWrapper.classList.add('column-menu-submenu-wrapper');

  const sortBtn = document.createElement('button');
  sortBtn.classList.add('column-menu-item', 'has-submenu');
  sortBtn.type = 'button';
  sortBtn.setAttribute('role', 'menuitem');
  sortBtn.setAttribute('aria-haspopup', 'menu');
  sortBtn.setAttribute('aria-expanded', 'false');
  sortBtn.dataset.columnMenuAction = 'toggle-sort';
  const sortIcon = document.createElement('span');
  sortIcon.dataset.lucide = 'arrow-up-down';
  sortIcon.setAttribute('aria-hidden', 'true');
  sortBtn.appendChild(sortIcon);
  const sortText = document.createTextNode(' Sort');
  sortBtn.appendChild(sortText);
  // Add chevron indicator for submenu (points left since submenu opens to the left)
  const chevronIcon = document.createElement('span');
  chevronIcon.dataset.lucide = 'chevron-left';
  chevronIcon.classList.add('submenu-chevron');
  chevronIcon.setAttribute('aria-hidden', 'true');
  sortBtn.appendChild(chevronIcon);
  sortBtn.title = 'Sort tasks in column';

  // Submenu container
  const sortSubmenu = document.createElement('div');
  sortSubmenu.classList.add('column-submenu', 'hidden');
  sortSubmenu.setAttribute('role', 'menu');

  // Sort by Due Date option
  const sortByDueDateBtn = document.createElement('button');
  sortByDueDateBtn.classList.add('column-menu-item');
  sortByDueDateBtn.type = 'button';
  sortByDueDateBtn.setAttribute('role', 'menuitem');
  sortByDueDateBtn.dataset.columnMenuAction = 'sort-due-date';
  sortByDueDateBtn.textContent = 'By Due Date';
  sortByDueDateBtn.title = 'Sort by due date (earliest first)';

  // Sort by Priority option
  const sortByPriorityBtn = document.createElement('button');
  sortByPriorityBtn.classList.add('column-menu-item');
  sortByPriorityBtn.type = 'button';
  sortByPriorityBtn.setAttribute('role', 'menuitem');
  sortByPriorityBtn.dataset.columnMenuAction = 'sort-priority';
  sortByPriorityBtn.textContent = 'By Priority';
  sortByPriorityBtn.title = 'Sort by priority (urgent to none)';

  sortSubmenu.appendChild(sortByDueDateBtn);
  sortSubmenu.appendChild(sortByPriorityBtn);

  // Show submenu on hover (desktop)
  sortWrapper.addEventListener('mouseenter', () => {
    sortSubmenu.classList.remove('hidden');
    sortBtn.setAttribute('aria-expanded', 'true');
  });

  sortWrapper.addEventListener('mouseleave', () => {
    sortSubmenu.classList.add('hidden');
    sortBtn.setAttribute('aria-expanded', 'false');
  });

  sortWrapper.appendChild(sortBtn);
  sortWrapper.appendChild(sortSubmenu);

  menu.appendChild(editColBtn);
  menu.appendChild(sortWrapper);
  menu.appendChild(deleteColBtn);

  menuWrapper.appendChild(menuBtn);
  menuWrapper.appendChild(menu);

  headerActions.appendChild(addBtn);
  headerActions.appendChild(menuWrapper);
  
  headerDiv.appendChild(collapseBtn);
  headerDiv.appendChild(dragHandle);
  headerDiv.appendChild(h2);
  headerDiv.appendChild(taskCounter);
  headerDiv.appendChild(headerActions);
  
  const ul = document.createElement('ul');
  ul.classList.add('tasks');
  ul.setAttribute('role', 'list');
  ul.setAttribute('aria-label', `Tasks in ${column.name}`);

  if (isCollapsed) {
    ul.classList.add('hidden');
    headerActions.classList.add('hidden');
    taskCounter.classList.add('hidden');
  }
  
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

/**
 * Sync task counters without full re-render (performance optimization)
 */
export function syncTaskCounters() {
  const tasks = loadTasks();
  const labelsById = new Map(loadLabels().map((l) => [l.id, { name: (l.name || '').toString().trim().toLowerCase(), group: (l.group || '').toString().trim().toLowerCase() }]));
  const queryLower = (boardFilterQuery || '').toString().trim().toLowerCase();
  const visibleTasks = queryLower
    ? tasks.filter((t) => taskMatchesFilter(t, queryLower, labelsById))
    : tasks;
  const countByColumn = buildTaskCountByColumn(visibleTasks);
  
  document.querySelectorAll('.task-counter').forEach(counter => {
    const columnId = counter.dataset.columnId;
    if (!columnId) return;

    counter.textContent = countByColumn.get(columnId) || 0;
  });
}

/**
 * Sync collapsed column titles without full re-render (performance optimization)
 */
export function syncCollapsedTitles() {
  const taskCountByColumn = buildTaskCountByColumn(loadTasks());

  document.querySelectorAll('.task-column.is-collapsed').forEach(columnEl => {
    const columnId = columnEl.dataset.column;
    const h2 = columnEl.querySelector('h2');
    if (!columnId || !h2) return;

    const taskCount = taskCountByColumn.get(columnId) || 0;
    const columnName = h2.textContent.replace(/\s*\(\d+\)$/, ''); // Remove existing count
    h2.textContent = `${columnName} (${taskCount})`;
  });
}

// Render all columns and tasks
export function renderBoard() {
  const columns = loadColumns();
  const tasks = loadTasks();
  const labels = loadLabels();
  const settings = loadSettings();

  // Memoize today's date for performance (avoid creating new Date for every task)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Pre-build labels map for performance (avoid repeated loadLabels calls in createTaskElement)
  const labelsMap = new Map(labels.map(l => [l.id, l]));
  const labelsById = new Map(labels.map((l) => [l.id, { name: (l.name || '').toString().trim().toLowerCase(), group: (l.group || '').toString().trim().toLowerCase() }]));
  
  const queryLower = (boardFilterQuery || '').toString().trim().toLowerCase();
  const visibleTasks = queryLower
    ? tasks.filter((t) => taskMatchesFilter(t, queryLower, labelsById))
    : tasks;
  const visibleTasksByColumn = buildTasksByColumn(visibleTasks);
  visibleTasksByColumn.forEach((columnTasks) => {
    columnTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });
  const container = document.getElementById('board-container');
  container.innerHTML = '';
  
  // Sort columns by order if present
  const sortedColumns = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  sortedColumns.forEach(column => {
    const columnTasks = visibleTasksByColumn.get(column.id) || [];
    const columnEl = createColumnElement(column, columnTasks.length);
    container.appendChild(columnEl);
    
    const tasksList = columnEl.querySelector('.tasks');
    const taskCounter = columnEl.querySelector('.task-counter');
    
    // Apply virtualization for Done column (performance optimization)
    const isDoneColumn = column.id === 'done';
    const shouldVirtualize = isDoneColumn && columnTasks.length > DONE_INITIAL_BATCH_SIZE;
    const tasksToRender = shouldVirtualize ? columnTasks.slice(0, doneVisibleCount) : columnTasks;
    
    tasksToRender.forEach(task => {
      tasksList.appendChild(createTaskElement(task, settings, labelsMap, today));
    });
    
    // Add "Show more" button for virtualized Done column
    if (shouldVirtualize && doneVisibleCount < columnTasks.length) {
      const showMoreBtn = document.createElement('button');
      showMoreBtn.classList.add('show-more-btn');
      showMoreBtn.type = 'button';
      showMoreBtn.textContent = `Show more (${columnTasks.length - doneVisibleCount} remaining)`;
      showMoreBtn.addEventListener('click', () => {
        doneVisibleCount += DONE_LOAD_MORE_SIZE;
        renderBoard();
      });
      tasksList.appendChild(showMoreBtn);
    }
    
    // Update task counter
    taskCounter.textContent = columnTasks.length;
    
  });
  
  initDragDrop();
  updateColumnSelect();

  // Re-render icons for dynamically created elements
  renderIcons();

  // Refresh notifications after board render
  refreshNotifications();

  ensureTaskInteractionHandlers();
  ensureColumnInteractionHandlers();
  ensureColumnMenuInteractionHandlers();

  if (!columnMenuCloseHandlerAttached) {
    columnMenuCloseHandlerAttached = true;
    document.addEventListener('click', () => closeAllColumnMenus());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllColumnMenus();
    });
  }
}
