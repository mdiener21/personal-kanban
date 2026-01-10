import { updateTaskPositions } from './tasks.js';
import { updateColumnPositions } from './columns.js';

// Touch handling state
let touchState = {
  draggedElement: null,
  clone: null,
  type: null, // 'task' or 'column'
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  offsetX: 0,
  offsetY: 0
};

// Attach drag listeners to tasks
export function attachTaskListeners() {
  const tasks = document.querySelectorAll(".task");
  
  tasks.forEach((task) => {
    // Mouse events
    task.addEventListener("dragstart", (event) => {
      task.id = "dragged-task";
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("task", "");
    });

    task.addEventListener("dragend", (event) => {
      task.removeAttribute("id");
    });

    // Touch events
    task.addEventListener("touchstart", handleTaskTouchStart, { passive: false });
    task.addEventListener("touchmove", handleTouchMove, { passive: false });
    task.addEventListener("touchend", handleTaskTouchEnd, { passive: false });
  });
}

// Attach drag listeners to columns (for task drops)
export function attachColumnListeners() {
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
    column.addEventListener("drop", async (event) => {
      event.preventDefault();

      const draggedTask = document.getElementById("dragged-task");
      const placeholder = column.querySelector(".placeholder");
      if (!draggedTask || !placeholder) return;
      const tasksList = column.querySelector(".tasks");
      draggedTask.remove();
      tasksList.insertBefore(draggedTask, placeholder);
      placeholder.remove();
      
      updateTaskPositions();
      const { renderBoard } = await import('./render.js');
      renderBoard();
    });
  });
}

// Attach drag listeners for column reordering
export function attachColumnDragListeners() {
  const columns = document.querySelectorAll(".task-column");
  const container = document.getElementById("board-container");
  
  columns.forEach((column) => {
    const dragHandle = column.querySelector('.column-drag-handle');
    
    // Disable default draggable on column, only enable via handle
    column.draggable = false;
    
    // Mouse events for desktop
    dragHandle.addEventListener("mousedown", () => {
      column.draggable = true;
    });
    
    document.addEventListener("mouseup", () => {
      column.draggable = false;
    });
    
    column.addEventListener("dragstart", (event) => {
      if (event.target.closest('.task')) {
        return;
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

    // Touch events for mobile
    dragHandle.addEventListener("touchstart", handleColumnTouchStart, { passive: false });
    dragHandle.addEventListener("touchmove", handleTouchMove, { passive: false });
    dragHandle.addEventListener("touchend", handleColumnTouchEnd, { passive: false });
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

function makePlaceholder(draggedTask) {
  const placeholder = document.createElement("li");
  placeholder.classList.add("placeholder");
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

function makeColumnPlaceholder(draggedColumn) {
  const placeholder = document.createElement("div");
  placeholder.classList.add("column-placeholder");
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

// Touch event handlers for tasks
function handleTaskTouchStart(event) {
  const task = event.currentTarget;
  const touch = event.touches[0];
  
  touchState.draggedElement = task;
  touchState.type = 'task';
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  
  const rect = task.getBoundingClientRect();
  touchState.offsetX = touch.clientX - rect.left;
  touchState.offsetY = touch.clientY - rect.top;
  
  // Mark as dragging after a short delay to distinguish from scroll
  setTimeout(() => {
    if (touchState.draggedElement === task) {
      task.id = "dragged-task";
      task.style.opacity = '0.5';
      
      // Create a visual clone
      touchState.clone = task.cloneNode(true);
      touchState.clone.style.position = 'fixed';
      touchState.clone.style.zIndex = '1000';
      touchState.clone.style.pointerEvents = 'none';
      touchState.clone.style.width = rect.width + 'px';
      touchState.clone.style.left = (touch.clientX - touchState.offsetX) + 'px';
      touchState.clone.style.top = (touch.clientY - touchState.offsetY) + 'px';
      touchState.clone.style.opacity = '0.8';
      document.body.appendChild(touchState.clone);
    }
  }, 100);
}

function handleColumnTouchStart(event) {
  const column = event.currentTarget.closest('.task-column');
  const touch = event.touches[0];
  
  touchState.draggedElement = column;
  touchState.type = 'column';
  touchState.startX = touch.clientX;
  touchState.startY = touch.clientY;
  
  const rect = column.getBoundingClientRect();
  touchState.offsetX = touch.clientX - rect.left;
  touchState.offsetY = touch.clientY - rect.top;
  
  setTimeout(() => {
    if (touchState.draggedElement === column) {
      column.id = "dragged-column";
      column.style.opacity = '0.5';
      
      touchState.clone = column.cloneNode(true);
      touchState.clone.style.position = 'fixed';
      touchState.clone.style.zIndex = '1000';
      touchState.clone.style.pointerEvents = 'none';
      touchState.clone.style.width = rect.width + 'px';
      touchState.clone.style.left = (touch.clientX - touchState.offsetX) + 'px';
      touchState.clone.style.top = (touch.clientY - touchState.offsetY) + 'px';
      touchState.clone.style.opacity = '0.8';
      document.body.appendChild(touchState.clone);
    }
  }, 100);
}

function handleTouchMove(event) {
  if (!touchState.draggedElement || !touchState.clone) return;
  
  event.preventDefault();
  const touch = event.touches[0];
  touchState.currentX = touch.clientX;
  touchState.currentY = touch.clientY;
  
  // Update clone position
  touchState.clone.style.left = (touch.clientX - touchState.offsetX) + 'px';
  touchState.clone.style.top = (touch.clientY - touchState.offsetY) + 'px';
  
  if (touchState.type === 'task') {
    // Find the column under the touch point
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    const column = elementUnderTouch?.closest('.task-column');
    
    if (column) {
      const tasks = column.querySelector('.tasks');
      const existingPlaceholder = document.querySelector('.placeholder');
      
      // Remove placeholder from other columns
      if (existingPlaceholder && !column.contains(existingPlaceholder)) {
        existingPlaceholder.remove();
      }
      
      // Find insertion point
      let insertBefore = null;
      const taskElements = Array.from(tasks.children).filter(el => 
        el.classList.contains('task') && el !== touchState.draggedElement
      );
      
      for (const taskEl of taskElements) {
        const rect = taskEl.getBoundingClientRect();
        if (touch.clientY < rect.top + rect.height / 2) {
          insertBefore = taskEl;
          break;
        }
      }
      
      const placeholder = existingPlaceholder || makePlaceholder();
      
      if (insertBefore) {
        tasks.insertBefore(placeholder, insertBefore);
      } else {
        tasks.appendChild(placeholder);
      }
    }
  } else if (touchState.type === 'column') {
    // Handle column reordering
    const container = document.getElementById('board-container');
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetColumn = elementUnderTouch?.closest('.task-column:not(#dragged-column)');
    
    const existingPlaceholder = container.querySelector('.column-placeholder');
    
    if (targetColumn) {
      const rect = targetColumn.getBoundingClientRect();
      const midpoint = rect.left + rect.width / 2;
      
      const placeholder = existingPlaceholder || makeColumnPlaceholder();
      
      if (touch.clientX < midpoint) {
        container.insertBefore(placeholder, targetColumn);
      } else {
        container.insertBefore(placeholder, targetColumn.nextSibling);
      }
    }
  }
}

async function handleTaskTouchEnd(event) {
  if (!touchState.draggedElement || touchState.type !== 'task') return;
  
  event.preventDefault();
  const task = touchState.draggedElement;
  const placeholder = document.querySelector('.placeholder');
  
  if (placeholder) {
    const column = placeholder.closest('.task-column');
    const tasks = column.querySelector('.tasks');
    
    // Move the actual task
    task.style.opacity = '';
    task.removeAttribute('id');
    tasks.insertBefore(task, placeholder);
    placeholder.remove();
    
    // Update positions and re-render
    updateTaskPositions();
    const { renderBoard } = await import('./render.js');
    renderBoard();
  } else {
    task.style.opacity = '';
    task.removeAttribute('id');
  }
  
  // Clean up
  if (touchState.clone) {
    touchState.clone.remove();
  }
  touchState = {
    draggedElement: null,
    clone: null,
    type: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    offsetX: 0,
    offsetY: 0
  };
}

function handleColumnTouchEnd(event) {
  if (!touchState.draggedElement || touchState.type !== 'column') return;
  
  event.preventDefault();
  const column = touchState.draggedElement;
  const placeholder = document.querySelector('.column-placeholder');
  const container = document.getElementById('board-container');
  
  if (placeholder) {
    column.style.opacity = '';
    column.removeAttribute('id');
    container.insertBefore(column, placeholder);
    placeholder.remove();
    
    updateColumnPositions();
  } else {
    column.style.opacity = '';
    column.removeAttribute('id');
  }
  
  // Clean up
  if (touchState.clone) {
    touchState.clone.remove();
  }
  touchState = {
    draggedElement: null,
    clone: null,
    type: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    offsetX: 0,
    offsetY: 0
  };
}
