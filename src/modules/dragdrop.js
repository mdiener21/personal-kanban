import { updateTaskPositions } from './tasks.js';
import { updateColumnPositions } from './columns.js';

// Attach drag listeners to tasks
export function attachTaskListeners() {
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
