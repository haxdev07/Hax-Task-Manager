// ===== Storage keys =====
const STORAGE_KEY = "task_manager_tasks_v1";
const THEME_KEY = "task_manager_theme";

// ===== State =====
let tasks = [];

// ===== Data handling with localStorage =====
function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  tasks = saved ? JSON.parse(saved) : [];
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ===== Helpers =====
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDate(iso) {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function comparePriority(a, b) {
  const order = { high: 3, medium: 2, low: 1 };
  return (order[b] || 0) - (order[a] || 0);
}

// ===== Theme handling =====
function applyTheme(theme) {
  const body = document.body;
  const icon = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");

  if (theme === "light") {
    body.classList.add("light-theme");
    if (icon) icon.textContent = "☀️";
    if (label) label.textContent = "Light";
  } else {
    body.classList.remove("light-theme");
    if (icon) icon.textContent = "🌙";
    if (label) label.textContent = "Dark";
  }
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === "light" ? "light" : "dark";
  applyTheme(theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light-theme");
  const newTheme = isLight ? "dark" : "light";
  localStorage.setItem(THEME_KEY, newTheme);
  applyTheme(newTheme);
}

// ===== DOM references (may not exist on every page) =====
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskDescInput = document.getElementById("taskDesc");
const taskDueInput = document.getElementById("taskDue");
const taskPrioritySelect = document.getElementById("taskPriority");

const searchInput = document.getElementById("searchInput");
const filterStatusSelect = document.getElementById("filterStatus");
const sortBySelect = document.getElementById("sortBy");

const taskListEl = document.getElementById("taskList");
const emptyStateEl = document.getElementById("emptyState");
const statsEl = document.getElementById("stats");
const clearAllBtn = document.getElementById("clearAllBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// PAGE_FILTER can be "all" | "pending" | "completed" (set from HTML)
const PAGE_FILTER = window.PAGE_FILTER || "all";

// ===== Render =====
function renderTasks() {
  if (!taskListEl || !statsEl || !emptyStateEl) {
    return; // safety: if this page doesn't have task UI
  }

  const query = (searchInput?.value || "").trim().toLowerCase();
  const sortBy = sortBySelect ? sortBySelect.value : "createdDesc";

  // base filter depending on page (dashboard/pending/completed)
  let filtered = tasks.filter((t) => {
    if (PAGE_FILTER === "completed") return t.completed;
    if (PAGE_FILTER === "pending") return !t.completed;
    return true; // "all" (dashboard)
  });

  // additional filterStatus on dashboard (All/Pending/Completed dropdown)
  if (filterStatusSelect && PAGE_FILTER === "all") {
    const statusFilter = filterStatusSelect.value;
    filtered = filtered.filter((t) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "completed"
          ? t.completed
          : !t.completed;
      return matchesStatus;
    });
  }

  // search
  if (query) {
    filtered = filtered.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(query) ||
        (t.description || "").toLowerCase().includes(query);
      return matchesSearch;
    });
  }

  // sort
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "createdAsc":
        return a.createdAt - b.createdAt;
      case "createdDesc":
        return b.createdAt - a.createdAt;
      case "dueAsc":
        return (a.dueDate || "") > (b.dueDate || "") ? 1 : -1;
      case "dueDesc":
        return (a.dueDate || "") < (b.dueDate || "") ? 1 : -1;
      case "priority":
        return comparePriority(a.priority, b.priority);
      default:
        return 0;
    }
  });

  // Clear list
  taskListEl.innerHTML = "";

  if (filtered.length === 0) {
    emptyStateEl.style.display = "block";
  } else {
    emptyStateEl.style.display = "none";
  }

  // Render each task
  filtered.forEach((task) => {
    const taskEl = document.createElement("div");
    taskEl.className = "task";

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      toggleComplete(task.id);
    });

    // Main area
    const main = document.createElement("div");
    main.className = "task-main";

    const topLine = document.createElement("div");
    topLine.className = "task-top-line";

    const titleSpan = document.createElement("span");
    titleSpan.className = "task-title" + (task.completed ? " completed" : "");
    titleSpan.textContent = task.title;

    topLine.appendChild(titleSpan);
    main.appendChild(topLine);

    if (task.description) {
      const descP = document.createElement("p");
      descP.className = "task-desc";
      descP.textContent = task.description;
      main.appendChild(descP);
    }

    const meta = document.createElement("div");
    meta.className = "task-meta";

    // priority badge
    const priorityBadge = document.createElement("span");
    priorityBadge.className =
      "badge " + (task.priority ? `badge-${task.priority}` : "");
    priorityBadge.textContent =
      "Priority: " +
      (task.priority.charAt(0).toUpperCase() + task.priority.slice(1));
    meta.appendChild(priorityBadge);

    // due badge
    if (task.dueDate) {
      const dueBadge = document.createElement("span");
      dueBadge.className = "badge";
      const today = new Date();
      const due = new Date(task.dueDate);
      dueBadge.textContent = "Due: " + formatDate(task.dueDate);

      if (!task.completed && due < today.setHours(0, 0, 0, 0)) {
        dueBadge.classList.add("badge-overdue");
      }
      meta.appendChild(dueBadge);
    }

    // status badge
    const statusBadge = document.createElement("span");
    statusBadge.className =
      "badge " + (task.completed ? "badge-completed" : "");
    statusBadge.textContent = task.completed ? "Completed" : "Pending";
    meta.appendChild(statusBadge);

    main.appendChild(meta);

    // Actions
    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.title = "Edit task";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => {
      editTask(task.id);
    });

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "icon-btn success";
    toggleBtn.title = "Toggle complete";
    toggleBtn.textContent = task.completed ? "↩" : "✔";
    toggleBtn.addEventListener("click", () => {
      toggleComplete(task.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn danger";
    deleteBtn.title = "Delete task";
    deleteBtn.textContent = "🗑";
    deleteBtn.addEventListener("click", () => {
      deleteTask(task.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(toggleBtn);
    actions.appendChild(deleteBtn);

    // Put all together
    taskEl.appendChild(checkbox);
    taskEl.appendChild(main);
    taskEl.appendChild(actions);

    taskListEl.appendChild(taskEl);
  });

  // Stats
  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const pendingCount = total - completedCount;

  let prefix = "";
  if (PAGE_FILTER === "completed") prefix = "Completed page • ";
  else if (PAGE_FILTER === "pending") prefix = "Pending page • ";

  statsEl.textContent =
    total === 0
      ? "No tasks yet"
      : `${prefix}${total} total • ${pendingCount} pending • ${completedCount} done`;
}

// ===== Actions =====
function addTask({ title, description, dueDate, priority }) {
  const newTask = {
    id: createId(),
    title,
    description,
    dueDate: dueDate || null,
    priority: priority || "medium",
    completed: false,
    createdAt: Date.now(),
  };
  tasks.push(newTask);
  saveTasks();
  renderTasks();
}

function editTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const newTitle = prompt("Edit title:", task.title);
  if (newTitle === null || newTitle.trim() === "") return;

  const newDesc = prompt(
    "Edit description (optional):",
    task.description || ""
  );
  const newDue = prompt(
    "Edit due date (YYYY-MM-DD) or leave empty:",
    task.dueDate || ""
  );
  const newPriority = prompt(
    "Edit priority: low / medium / high",
    task.priority
  );

  task.title = newTitle.trim();
  task.description = newDesc ? newDesc.trim() : "";
  task.dueDate = newDue ? newDue.trim() : null;
  if (["low", "medium", "high"].includes((newPriority || "").toLowerCase())) {
    task.priority = newPriority.toLowerCase();
  }

  saveTasks();
  renderTasks();
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
}

function clearAll() {
  if (!confirm("Clear ALL tasks?")) return;
  tasks = [];
  saveTasks();
  renderTasks();
}

// ===== Event bindings =====
function setupEvents() {
  if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = taskTitleInput.value.trim();
      if (!title) {
        alert("Please enter a task title.");
        return;
      }
      const description = taskDescInput.value.trim();
      const dueDate = taskDueInput.value || null;
      const priority = taskPrioritySelect.value;

      addTask({ title, description, dueDate, priority });

      taskForm.reset();
      taskPrioritySelect.value = "medium";
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderTasks);
  }

  if (filterStatusSelect) {
    filterStatusSelect.addEventListener("change", renderTasks);
  }

  if (sortBySelect) {
    sortBySelect.addEventListener("change", renderTasks);
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", clearAll);
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }
}

// ===== Init =====
loadTasks();
loadTheme();
setupEvents();
renderTasks();
