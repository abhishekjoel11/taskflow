/* ===== TaskFlow - To-Do List App ===== */

// ---------- 1. State ----------
let tasks = loadTasks();     // array of task objects
let currentFilter = "all";   // "all" | "active" | "completed"
let editingId = null;        // id of the task currently being edited

// ---------- 2. DOM elements ----------
const form = document.getElementById("taskForm");
const input = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const list = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyText = document.getElementById("emptyText");
const counter = document.getElementById("counter");
const clearBtn = document.getElementById("clearBtn");
const filterButtons = document.querySelectorAll(".filter-btn");

// ---------- 3. localStorage helpers ----------
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem("taskflow-tasks")) || [];
  } catch (error) {
    return []; // if saved data is corrupted, start fresh
  }
}

function saveTasks() {
  localStorage.setItem("taskflow-tasks", JSON.stringify(tasks));
}

// ---------- 4. Core actions ----------
function addTask(text, priority) {
  tasks.unshift({
    id: Date.now(),          // unique id based on current time
    text: text,
    priority: priority,
    completed: false
  });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  saveTasks();
  render();
}

function deleteTask(id, element) {
  // Play the fade-out animation first, then remove the data
  element.classList.add("removing");
  setTimeout(() => {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
  }, 250);
}

function saveEdit(id, newText) {
  const text = newText.trim();
  const task = tasks.find((t) => t.id === id);
  if (task && text) task.text = text; // ignore empty edits
  editingId = null;
  saveTasks();
  render();
}

// ---------- 5. Rendering ----------

// Escape HTML so user text can never inject code
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Return tasks matching the selected filter
function getFilteredTasks() {
  if (currentFilter === "active") return tasks.filter((t) => !t.completed);
  if (currentFilter === "completed") return tasks.filter((t) => t.completed);
  return tasks;
}

function render() {
  const visible = getFilteredTasks();

  // Build the list items
  list.innerHTML = visible
    .map((task) => {
      const isEditing = task.id === editingId;
      return `
        <li class="task ${task.completed ? "done" : ""}" data-id="${task.id}">
          <input type="checkbox" class="check" data-action="toggle" ${task.completed ? "checked" : ""} aria-label="Mark complete" />
          <div class="task-body">
            ${
              isEditing
                ? `<input type="text" class="edit-input" value="${escapeHTML(task.text).replace(/"/g, "&quot;")}" maxlength="100" />`
                : `<div class="task-text">${escapeHTML(task.text)}</div>`
            }
            <span class="badge ${task.priority}">${task.priority}</span>
          </div>
          <div class="actions">
            <button class="icon-btn" data-action="edit" title="${isEditing ? "Save" : "Edit"}">${isEditing ? "💾" : "✏️"}</button>
            <button class="icon-btn delete" data-action="delete" title="Delete">🗑️</button>
          </div>
        </li>`;
    })
    .join("");

  // Focus the edit box when editing starts
  if (editingId) {
    const editBox = list.querySelector(".edit-input");
    if (editBox) {
      editBox.focus();
      editBox.setSelectionRange(editBox.value.length, editBox.value.length);
    }
  }

  updateEmptyState(visible.length);
  updateStats();
}

// Show a friendly message when there is nothing to display
function updateEmptyState(visibleCount) {
  emptyState.classList.toggle("hidden", visibleCount > 0);
  if (visibleCount > 0) return;

  if (tasks.length === 0) {
    emptyTitle.textContent = "No tasks yet";
    emptyText.textContent = "Add your first task above and start being productive!";
  } else if (currentFilter === "active") {
    emptyTitle.textContent = "All caught up! 🎉";
    emptyText.textContent = "You have no active tasks. Great job!";
  } else {
    emptyTitle.textContent = "Nothing completed yet";
    emptyText.textContent = "Finish a task and it will show up here.";
  }
}

// Update dashboard numbers, progress bar and live counter
function updateStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const active = total - done;
  const high = tasks.filter((t) => t.priority === "high" && !t.completed).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statActive").textContent = active;
  document.getElementById("statDone").textContent = done;
  document.getElementById("statHigh").textContent = high;
  document.getElementById("progressText").textContent = percent + "%";
  document.getElementById("progressFill").style.width = percent + "%";

  counter.textContent = `${active} ${active === 1 ? "task" : "tasks"} left`;
  clearBtn.style.display = done > 0 ? "block" : "none";
}

// ---------- 6. Event listeners ----------

// Add a new task
form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop page reload
  const text = input.value.trim();
  if (!text) return;
  addTask(text, prioritySelect.value);
  input.value = "";
  input.focus();
});

// Handle checkbox / edit / delete clicks using event delegation
list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const item = button.closest(".task");
  const id = Number(item.dataset.id);
  const action = button.dataset.action;

  if (action === "toggle") toggleTask(id);
  if (action === "delete") deleteTask(id, item);
  if (action === "edit") {
    if (editingId === id) {
      saveEdit(id, item.querySelector(".edit-input").value); // save
    } else {
      editingId = id; // start editing
      render();
    }
  }
});

// Press Enter to save an edit, Escape to cancel
list.addEventListener("keydown", (event) => {
  if (!event.target.classList.contains("edit-input")) return;
  const id = Number(event.target.closest(".task").dataset.id);
  if (event.key === "Enter") saveEdit(id, event.target.value);
  if (event.key === "Escape") {
    editingId = null;
    render();
  }
});

// Filter buttons
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    editingId = null;
    render();
  });
});

// Clear all completed tasks
clearBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.completed);
  saveTasks();
  render();
});

// ---------- 7. Start the app ----------
render();
