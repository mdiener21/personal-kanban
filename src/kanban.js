// Simple UUID v4 generator (pure JavaScript)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Load columns from localStorage
function loadColumns() {
  const stored = localStorage.getItem('kanbanColumns');
  if (stored) {
    return JSON.parse(stored);
  }
  // Default columns if none exist
  return [
    { id: 'todo', name: 'To Do' },
    { id: 'inprogress', name: 'In Progress' },
    { id: 'done', name: 'Done' }
  ];
}

// Save columns to localStorage
function saveColumns(columns) {
  localStorage.setItem('kanbanColumns', JSON.stringify(columns));
}

// Load tasks from localStorage
function loadTasks() {
  const stored = localStorage.getItem('kanbanTasks');
  if (stored) {
    return JSON.parse(stored);
  }
  // Default tasks if none exist
  return [
    { id: generateUUID(), text: 'Find out where Soul Stone is', column: 'todo', labels: ['urgent'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Time Stone from Dr. Strange', column: 'verified', labels: ['feature'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Mind Stone from Vision', column: 'verified', labels: [], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Reality Stone from the Collector', column: 'verified', labels: ['bug'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Power Stone from Xandar', column: 'done', labels: ['urgent', 'feature'], creationDate: new Date().toISOString() },
    { id: generateUUID(), text: 'Collect Space Stone from Asgard', column: 'done', labels: [], creationDate: new Date().toISOString() }
  ];
}

// Save tasks to localStorage
function saveTasks(tasks) {
  localStorage.setItem('kanbanTasks', JSON.stringify(tasks));
}

// Load labels from localStorage
function loadLabels() {
  const stored = localStorage.getItem('kanbanLabels');
  if (stored) {
    return JSON.parse(stored);
  }
  // Default labels if none exist
  return [
    { id: 'urgent', name: 'Urgent', color: '#ef4444' },
    { id: 'feature', name: 'Feature', color: '#3b82f6' },
    { id: 'task', name: 'Task', color: '#f59e0b' }
  ];
}

// Save labels to localStorage
function saveLabels(labels) {
  localStorage.setItem('kanbanLabels', JSON.stringify(labels));
}

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
  
  const textSpan = document.createElement('span');
  textSpan.classList.add('task-text');
  textSpan.textContent = task.text;
  textSpan.addEventListener('click', () => showEditModal(task.id));
  
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('delete-task-btn');
  const deleteIcon = document.createElement('span');
  deleteIcon.dataset.lucide = 'x';
  deleteBtn.appendChild(deleteIcon);
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });
  
  li.appendChild(textSpan);
  li.appendChild(labelsContainer);
  li.appendChild(deleteBtn);
  
  return li;
}

// Create a column element
function createColumnElement(column) {
  const div = document.createElement('div');
  div.classList.add('task-column');
  div.dataset.column = column.id;
  // draggable is set to false by default, enabled only via drag handle
  div.draggable = false;
  
  // Drag handle for column
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
  deleteColBtn.addEventListener('click', () => deleteColumn(column.id));
  
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

// Render all columns and tasks
function renderBoard() {
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

// Delete a task
function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }
  const tasks = loadTasks();
  const filtered = tasks.filter(t => t.id !== taskId);
  saveTasks(filtered);
  renderBoard();
}

// Delete a column
function deleteColumn(columnId) {
  const columns = loadColumns();
  if (columns.length <= 1) {
    alert('Cannot delete the last column!');
    return;
  }
  
  const tasks = loadTasks();
  const tasksInColumn = tasks.filter(t => t.column === columnId);
  
  if (tasksInColumn.length > 0) {
    if (!confirm(`This column has ${tasksInColumn.length} task(s). Delete anyway?`)) {
      return;
    }
    // Remove tasks in this column
    const filteredTasks = tasks.filter(t => t.column !== columnId);
    saveTasks(filteredTasks);
  }
  
  const filteredColumns = columns.filter(c => c.id !== columnId);
  saveColumns(filteredColumns);
  renderBoard();
}

// Add a new column
function addColumn(name) {
  if (!name || name.trim() === '') return;
  
  const columns = loadColumns();
  const maxOrder = columns.reduce((max, c) => Math.max(max, c.order ?? 0), 0);
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + generateUUID().substring(0, 8);
  const newColumn = { id, name: name.trim(), order: maxOrder + 1 };
  columns.push(newColumn);
  saveColumns(columns);
  renderBoard();
}

// Update an existing column
function updateColumn(columnId, name) {
  if (!name || name.trim() === '') return;
  
  const columns = loadColumns();
  const columnIndex = columns.findIndex(c => c.id === columnId);
  if (columnIndex !== -1) {
    columns[columnIndex].name = name.trim();
    saveColumns(columns);
    renderBoard();
  }
}

// Add a new label
function addLabel(name, color) {
  if (!name || name.trim() === '') return;
  
  const labels = loadLabels();
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + generateUUID().substring(0, 8);
  const newLabel = { id, name: name.trim(), color };
  labels.push(newLabel);
  saveLabels(labels);
  return newLabel;
}

// Update an existing label
function updateLabel(labelId, name, color) {
  if (!name || name.trim() === '') return;
  
  const labels = loadLabels();
  const labelIndex = labels.findIndex(l => l.id === labelId);
  if (labelIndex !== -1) {
    labels[labelIndex].name = name.trim();
    labels[labelIndex].color = color;
    saveLabels(labels);
    renderBoard();
  }
}

// Delete a label
function deleteLabel(labelId) {
  const labels = loadLabels();
  const tasks = loadTasks();
  
  // Remove label from all tasks
  tasks.forEach(task => {
    if (task.labels) {
      task.labels = task.labels.filter(id => id !== labelId);
    }
  });
  saveTasks(tasks);
  
  // Remove the label
  const filteredLabels = labels.filter(l => l.id !== labelId);
  saveLabels(filteredLabels);
  renderBoard();
}

// Modal elements
let currentColumn = 'todo';
let editingTaskId = null;
let editingColumnId = null;
let editingLabelId = null;
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

function showModal(columnName) {
  currentColumn = columnName || loadColumns()[0]?.id || 'todo';
  editingTaskId = null;
  selectedTaskLabels = [];
  
  const modal = document.getElementById('task-modal');
  const columnSelect = document.getElementById('task-column');
  const taskText = document.getElementById('task-text');
  const modalTitle = document.getElementById('task-modal-title');
  const submitBtn = document.getElementById('task-submit-btn');
  
  modalTitle.textContent = 'Add New Task';
  submitBtn.textContent = 'Add Task';
  columnSelect.value = currentColumn;
  taskText.value = '';

  const labelSearch = document.getElementById('task-label-search');
  if (labelSearch) labelSearch.value = '';

  updateTaskLabelsSelection();
  modal.classList.remove('hidden');
  taskText.focus();
}

function showEditModal(taskId) {
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  editingTaskId = taskId;
  selectedTaskLabels = task.labels || [];
  
  const modal = document.getElementById('task-modal');
  const columnSelect = document.getElementById('task-column');
  const taskText = document.getElementById('task-text');
  const modalTitle = document.getElementById('task-modal-title');
  const submitBtn = document.getElementById('task-submit-btn');
  
  modalTitle.textContent = 'Edit Task';
  submitBtn.textContent = 'Save Changes';
  columnSelect.value = task.column;
  taskText.value = task.text;

  const labelSearch = document.getElementById('task-label-search');
  if (labelSearch) labelSearch.value = '';

  updateTaskLabelsSelection();
  modal.classList.remove('hidden');
  taskText.focus();
}

function hideModal() {
  const modal = document.getElementById('task-modal');
  modal.classList.add('hidden');
  editingTaskId = null;
}

function showColumnModal() {
  editingColumnId = null;
  const modal = document.getElementById('column-modal');
  const columnName = document.getElementById('column-name');
  const modalTitle = document.getElementById('column-modal-title');
  const submitBtn = document.getElementById('column-submit-btn');
  
  modalTitle.textContent = 'Add New Column';
  submitBtn.textContent = 'Add Column';
  columnName.value = '';
  modal.classList.remove('hidden');
  columnName.focus();
}

function showEditColumnModal(columnId) {
  const columns = loadColumns();
  const column = columns.find(c => c.id === columnId);
  if (!column) return;
  
  editingColumnId = columnId;
  const modal = document.getElementById('column-modal');
  const columnName = document.getElementById('column-name');
  const modalTitle = document.getElementById('column-modal-title');
  const submitBtn = document.getElementById('column-submit-btn');
  
  modalTitle.textContent = 'Edit Column';
  submitBtn.textContent = 'Save Changes';
  columnName.value = column.name;
  modal.classList.remove('hidden');
  columnName.focus();
}

function hideColumnModal() {
  const modal = document.getElementById('column-modal');
  modal.classList.add('hidden');
  editingColumnId = null;
}

// Show labels management modal
function showLabelsModal() {
  renderLabelsList();
  const modal = document.getElementById('labels-modal');
  modal.classList.remove('hidden');
}

function hideLabelsModal() {
  const modal = document.getElementById('labels-modal');
  modal.classList.add('hidden');
}

// Show/hide help modal
function showHelpModal() {
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

    // Render label as in tasks, left side
    const labelSpan = document.createElement('span');
    labelSpan.classList.add('task-label');
    labelSpan.style.backgroundColor = label.color;
    labelSpan.textContent = label.name;

    // Actions, right side
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
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete label "${label.name}"? This will remove it from all tasks.`)) {
        deleteLabel(label.id);
        renderLabelsList();
      }
    });

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    labelItem.appendChild(labelSpan);
    labelItem.appendChild(actionsDiv);
    container.appendChild(labelItem);
  });
  
  lucide.createIcons();
}

// Update the task labels selection UI
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
    
    // Render label pill like on task cards (colored span with text)
    const labelPill = document.createElement('span');
    labelPill.classList.add('task-label', 'label-color-swatch');
    labelPill.style.backgroundColor = label.color;
    labelPill.textContent = label.name;
    
    labelEl.appendChild(checkbox);
    labelEl.appendChild(labelPill);
    container.appendChild(labelEl);
  });
}

// Add a new task (updated to use form data)
function addTask(text, columnName) {
  console.log('Adding task:', text, 'to column:', columnName);
  if (!text || text.trim() === '') return;
  
  const tasks = loadTasks();
  // Get max order for tasks in this column
  const columnTasks = tasks.filter(t => t.column === columnName);
  const maxOrder = columnTasks.reduce((max, t) => Math.max(max, t.order ?? 0), 0);
  
  const newTask = {
    id: generateUUID(),
    text: text.trim(),
    column: columnName,
    order: maxOrder + 1,
    labels: [...selectedTaskLabels],
    creationDate: new Date().toISOString()
  };
  tasks.push(newTask);
  saveTasks(tasks);
  renderBoard();
}

// Update an existing task
function updateTask(taskId, text, columnName) {
  if (!text || text.trim() === '') return;
  
  const tasks = loadTasks();
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    tasks[taskIndex].text = text.trim();
    tasks[taskIndex].column = columnName;
    tasks[taskIndex].labels = [...selectedTaskLabels];
    saveTasks(tasks);
    renderBoard();
  }
}

// Get current task positions from DOM
function getCurrentTaskOrder() {
  const tasks = [];
  document.querySelectorAll('.task-column').forEach(column => {
    const columnName = column.dataset.column;
    column.querySelectorAll('.task').forEach(taskEl => {
      tasks.push({
        id: taskEl.dataset.taskId,
        column: columnName
      });
    });
  });
  return tasks;
}

// Update task positions after drag
function updateTaskPositions() {
  const currentOrder = getCurrentTaskOrder();
  const tasks = loadTasks();
  
  // Update each task with new column and order based on DOM position
  const updatedTasks = tasks.map(task => {
    const currentIndex = currentOrder.findIndex(c => c.id === task.id);
    if (currentIndex !== -1) {
      const current = currentOrder[currentIndex];
      // Calculate order within column
      const tasksInSameColumn = currentOrder.filter((t, i) => t.column === current.column && i <= currentIndex);
      return { ...task, column: current.column, order: tasksInSameColumn.length };
    }
    return task;
  });
  
  saveTasks(updatedTasks);
  renderBoard();
}

// Attach drag listeners to tasks
function attachTaskListeners() {
  const tasks = document.querySelectorAll(".task");
  
  tasks.forEach((task) => {
    task.addEventListener("dragstart", (event) => {
      task.id = "dragged-task";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("task", "");
    });

    task.addEventListener("dragend", (event) => {
      task.removeAttribute("id");
    });
  });
}

// Attach drag listeners to columns (for task drops)
function attachColumnListeners() {
  const columns = document.querySelectorAll(".task-column");
  
  columns.forEach((column) => {
    column.addEventListener("dragover", (event) => {
      // Check if dragging a task or a column
      if (event.dataTransfer.types.includes("task")) {
        movePlaceholder(event);
      } else if (event.dataTransfer.types.includes("column")) {
        moveColumnPlaceholder(event);
      }
    });
    column.addEventListener("dragleave", (event) => {
      if (column.contains(event.relatedTarget)) return;
      const placeholder = column.querySelector(".placeholder");
      placeholder?.remove();
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();

      const draggedTask = document.getElementById("dragged-task");
      const placeholder = column.querySelector(".placeholder");
      if (!draggedTask || !placeholder) return;
      const tasksList = column.querySelector(".tasks");
      draggedTask.remove();
      tasksList.insertBefore(draggedTask, placeholder);
      placeholder.remove();
      
      updateTaskPositions();
    });
  });
}

// Attach drag listeners for column reordering
function attachColumnDragListeners() {
  const columns = document.querySelectorAll(".task-column");
  const container = document.getElementById("board-container");
  
  columns.forEach((column) => {
    const dragHandle = column.querySelector('.column-drag-handle');
    
    // Disable default draggable on column, only enable via handle
    column.draggable = false;
    
    // Enable dragging when mouse down on handle
    dragHandle.addEventListener("mousedown", () => {
      column.draggable = true;
    });
    
    // Disable dragging when mouse up anywhere
    document.addEventListener("mouseup", () => {
      column.draggable = false;
    });
    
    column.addEventListener("dragstart", (event) => {
      // Check if we're dragging a task instead
      if (event.target.closest('.task')) {
        return; // Let task drag handle it
      }
      
      column.id = "dragged-column";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("column", "");
    });

    column.addEventListener("dragend", () => {
      column.removeAttribute("id");
      column.draggable = false;
      const placeholder = container.querySelector(".column-placeholder");
      placeholder?.remove();
    });
  });
  
  container.addEventListener("dragover", (event) => {
    if (!event.dataTransfer.types.includes("column")) return;
    event.preventDefault();
    moveColumnPlaceholder(event);
  });
  
  container.addEventListener("drop", (event) => {
    if (!event.dataTransfer.types.includes("column")) return;
    event.preventDefault();
    
    const draggedColumn = document.getElementById("dragged-column");
    const placeholder = container.querySelector(".column-placeholder");
    if (!draggedColumn || !placeholder) return;
    
    container.insertBefore(draggedColumn, placeholder);
    placeholder.remove();
    
    updateColumnPositions();
  });
}

function makeColumnPlaceholder(draggedColumn) {
  const placeholder = document.createElement("div");
  placeholder.classList.add("column-placeholder");
  placeholder.style.width = `${draggedColumn.offsetWidth}px`;
  placeholder.style.height = `${draggedColumn.offsetHeight}px`;
  return placeholder;
}

function moveColumnPlaceholder(event) {
  if (!event.dataTransfer.types.includes("column")) return;
  
  const container = document.getElementById("board-container");
  const draggedColumn = document.getElementById("dragged-column");
  if (!draggedColumn) return;
  
  const existingPlaceholder = container.querySelector(".column-placeholder");
  const columns = Array.from(container.querySelectorAll(".task-column:not(#dragged-column)"));
  
  for (const column of columns) {
    const rect = column.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    
    if (event.clientX < midpoint) {
      if (existingPlaceholder && existingPlaceholder.nextElementSibling === column) return;
      existingPlaceholder?.remove();
      container.insertBefore(makeColumnPlaceholder(draggedColumn), column);
      return;
    }
  }
  
  // If we're past all columns, append at end
  existingPlaceholder?.remove();
  container.appendChild(makeColumnPlaceholder(draggedColumn));
}

// Update column positions after drag
function updateColumnPositions() {
  const container = document.getElementById("board-container");
  const columnElements = container.querySelectorAll(".task-column");
  const columns = loadColumns();
  
  columnElements.forEach((colEl, index) => {
    const columnId = colEl.dataset.column;
    const column = columns.find(c => c.id === columnId);
    if (column) {
      column.order = index + 1;
    }
  });
  
  saveColumns(columns);
}

function makePlaceholder(draggedTask) {
  const placeholder = document.createElement("li");
  placeholder.classList.add("placeholder");
  placeholder.style.height = `${draggedTask.offsetHeight}px`;
  return placeholder;
}
function movePlaceholder(event) {
  if (!event.dataTransfer.types.includes("task")) {
    return;
  }
  event.preventDefault();
  const draggedTask = document.getElementById("dragged-task");
  const column = event.currentTarget;
  const tasks = column.querySelector(".tasks");
  const existingPlaceholder = column.querySelector(".placeholder");
  
  if (existingPlaceholder) {
    const placeholderRect = existingPlaceholder.getBoundingClientRect();
    if (
      placeholderRect.top <= event.clientY &&
      placeholderRect.bottom >= event.clientY
    ) {
      return;
    }
  }
  
  for (const task of tasks.children) {
    if (task.getBoundingClientRect().bottom >= event.clientY) {
      if (task === existingPlaceholder) return;
      existingPlaceholder?.remove();
      if (task === draggedTask || task.previousElementSibling === draggedTask)
        return;
      tasks.insertBefore(
        existingPlaceholder ?? makePlaceholder(draggedTask),
        task,
      );
      return;
    }
  }
  existingPlaceholder?.remove();
  if (tasks.lastElementChild === draggedTask) return;
  tasks.append(existingPlaceholder ?? makePlaceholder(draggedTask));
}

// Export tasks and columns to JSON file
function exportTasks() {
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
function importTasks(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
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
      renderBoard();
      alert('Board imported successfully!');
    } catch (error) {
      alert('Error parsing JSON file: ' + error.message);
    }
  };
  reader.readAsText(file);
}

// Add task button listeners
document.addEventListener('DOMContentLoaded', () => {

  const taskLabelSearch = document.getElementById('task-label-search');
  taskLabelSearch?.addEventListener('input', updateTaskLabelsSelection);

  // Modal event listeners
  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = document.getElementById('task-text').value;
    const column = document.getElementById('task-column').value;
    
    if (editingTaskId) {
      updateTask(editingTaskId, text, column);
    } else {
      addTask(text, column);
    }
    hideModal();
  });

  document.getElementById('cancel-task-btn').addEventListener('click', hideModal);

  document.querySelector('#task-modal .modal-backdrop').addEventListener('click', hideModal);

  // Column modal event listeners
  document.getElementById('column-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('column-name').value;
    
    if (editingColumnId) {
      updateColumn(editingColumnId, name);
    } else {
      addColumn(name);
    }
    hideColumnModal();
  });

  document.getElementById('cancel-column-btn').addEventListener('click', hideColumnModal);

  document.querySelector('#column-modal .modal-backdrop').addEventListener('click', hideColumnModal);

  // Label modal event listeners
  document.getElementById('manage-labels-btn').addEventListener('click', showLabelsModal);
  
  document.getElementById('labels-close-btn').addEventListener('click', hideLabelsModal);
  
  document.getElementById('add-label-btn').addEventListener('click', () => showLabelModal());
  
  document.getElementById('label-form').addEventListener('submit', (e) => {
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
  });
  
  document.getElementById('cancel-label-btn').addEventListener('click', hideLabelModal);
  
  document.querySelector('#labels-modal .modal-backdrop').addEventListener('click', hideLabelsModal);
  
  document.querySelector('#label-modal .modal-backdrop').addEventListener('click', hideLabelModal);

  // Help modal event listeners
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
      hideHelpModal();
    }
  });

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
