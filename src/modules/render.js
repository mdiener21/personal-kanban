import { loadColumns, loadTasks, loadLabels } from './storage.js';
import { deleteTask } from './tasks.js';
import { deleteColumn } from './columns.js';
import { showModal, showEditModal, showEditColumnModal } from './modals.js';
import { attachTaskListeners, attachColumnListeners, attachColumnDragListeners } from './dragdrop.js';

// Create a task element
function createTaskElement(task) {
  const li = document.createElement('li');
  li.classList.add('task');
  li.draggable = true;
  li.dataset.taskId = task.id;
  
  // Labels container
  const labelsContainer = document.createElement('div');
  labelsContainer.classList.add('task-labels');
  
  const labels = loadLabels();
  if (task.labels && task.labels.length > 0) {
    task.labels.forEach(labelId => {
      const label = labels.find(l => l.id === labelId);
      if (label) {
        const labelEl = document.createElement('span');
        labelEl.classList.add('task-label');
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
  const legacyTitle = typeof task.text === 'string' ? task.text : '';
  titleEl.textContent = (typeof task.title === 'string' && task.title.trim() !== '') ? task.title : legacyTitle;
  titleEl.addEventListener('click', () => showEditModal(task.id));

  const actions = document.createElement('div');
  actions.classList.add('task-actions');

  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-task-btn');
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'trash-2';
  deleteBtn.appendChild(deleteIcon);
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (deleteTask(task.id)) {
      renderBoard();
    }
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

  const dueDateRaw = typeof task.dueDate === 'string' ? task.dueDate.trim() : '';
  const dueDateEl = document.createElement('span');
  dueDateEl.classList.add('task-date');
  if (!dueDateRaw) {
    dueDateEl.textContent = 'No due date';
  } else {
    const dateForParse = dueDateRaw.includes('T') ? dueDateRaw : `${dueDateRaw}T00:00:00`;
    const parsed = new Date(dateForParse);
    dueDateEl.textContent = Number.isNaN(parsed.getTime()) ? dueDateRaw : parsed.toLocaleDateString();
  }

  meta.appendChild(priorityEl);
  meta.appendChild(dueDateEl);

  li.appendChild(header);
  li.appendChild(descriptionEl);
  li.appendChild(labelsContainer);
  li.appendChild(meta);
  
  return li;
}

// Create a column element
function createColumnElement(column) {
  const div = document.createElement('div');
  div.classList.add('task-column');
  div.dataset.column = column.id;
  div.draggable = false;

  if (column?.color) {
    div.style.setProperty('--column-accent', column.color);
  }
  
  const dragHandle = document.createElement('div');
  dragHandle.classList.add('column-drag-handle');
  const gripIcon = document.createElement('span');
  gripIcon.dataset.lucide = 'grip-vertical';
  dragHandle.appendChild(gripIcon);
  dragHandle.title = 'Drag to reorder';
  
  const headerDiv = document.createElement('div');
  headerDiv.classList.add('column-header');
  
  const h2 = document.createElement('h2');
  h2.textContent = column.name;
  
  const taskCounter = document.createElement('span');
  taskCounter.classList.add('task-counter');
  taskCounter.dataset.columnId = column.id;
  taskCounter.textContent = '0';
  
  const headerActions = document.createElement('div');
  headerActions.classList.add('column-actions');
  
  const addBtn = document.createElement('button');
  addBtn.classList.add('add-task-btn-icon');
  const plusIcon = document.createElement('span');
  plusIcon.dataset.lucide = 'plus';
  addBtn.appendChild(plusIcon);
  addBtn.title = 'Add task';
  addBtn.addEventListener('click', () => showModal(column.id));
  
  const editColBtn = document.createElement('button');
  editColBtn.classList.add('edit-column-btn');
  const editIcon = document.createElement('span');
  editIcon.dataset.lucide = 'pencil';
  editColBtn.appendChild(editIcon);
  editColBtn.title = 'Edit column name';
  editColBtn.addEventListener('click', () => showEditColumnModal(column.id));
  
  const deleteColBtn = document.createElement('button');
  deleteColBtn.classList.add('delete-column-btn');
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'trash-2';
  deleteColBtn.appendChild(deleteIcon);
  deleteColBtn.title = 'Delete column';
  deleteColBtn.addEventListener('click', async () => {
    if (deleteColumn(column.id)) {
      renderBoard();
    }
  });
  
  headerActions.appendChild(addBtn);
  headerActions.appendChild(editColBtn);
  headerActions.appendChild(deleteColBtn);
  
  headerDiv.appendChild(dragHandle);
  headerDiv.appendChild(h2);
  headerDiv.appendChild(taskCounter);
  headerDiv.appendChild(headerActions);
  
  const ul = document.createElement('ul');
  ul.classList.add('tasks');
  
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
    const columnTasks = tasks.filter(t => t.column === column.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    columnTasks.forEach(task => {
      tasksList.appendChild(createTaskElement(task));
    });
    
    // Update task counter
    taskCounter.textContent = columnTasks.length;
    
    // Check if column has more than 12 tasks
    if (columnTasks.length > 12) {
      columnEl.classList.add('has-hidden-tasks');
      const showAllBtn = document.createElement('button');
      showAllBtn.classList.add('show-all-tasks-btn');
      showAllBtn.type = 'button';
      const totalTasksCount = columnTasks.length;
      showAllBtn.textContent = `Show all tasks (${totalTasksCount})`;
      showAllBtn.addEventListener('click', () => {
        tasksList.classList.toggle('expanded');
        showAllBtn.textContent = tasksList.classList.contains('expanded') 
          ? 'Hide extra tasks' 
          : `Show all tasks (${totalTasksCount})`;
      });
      columnEl.appendChild(showAllBtn);
    }
  });
  
  attachTaskListeners();
  attachColumnListeners();
  attachColumnDragListeners();
  updateColumnSelect();
  lucide.createIcons();
}
