const ORDER_KEY = "clickup-desktop-board.task-order";

const state = {
  tasks: [],
  userName: "",
  fetchedAt: null,
  query: "",
  alwaysOnTop: true,
};

const els = {
  subtitle: document.getElementById("subtitle"),
  countLabel: document.getElementById("countLabel"),
  updatedLabel: document.getElementById("updatedLabel"),
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  errorState: document.getElementById("errorState"),
  searchInput: document.getElementById("searchInput"),
  pinBtn: document.getElementById("pinBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  minimizeBtn: document.getElementById("minimizeBtn"),
  closeBtn: document.getElementById("closeBtn"),
};

let dragMoved = false;

function loadOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveOrder(ids) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
}

function applyCustomOrder(tasks, orderIds) {
  const map = new Map(tasks.map((task) => [task.id, task]));
  const ordered = [];

  for (const id of orderIds) {
    const task = map.get(id);
    if (!task) continue;
    ordered.push(task);
    map.delete(id);
  }

  for (const task of map.values()) {
    ordered.push(task);
  }

  return ordered;
}

function formatDue(dueDate) {
  if (!dueDate) return { text: "無到期日", className: "muted" };
  const date = new Date(dueDate);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDue = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((startDue - startToday) / dayMs);
  const label = date.toLocaleDateString("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });

  if (diffDays < 0) return { text: `逾期 ${label}`, className: "overdue" };
  if (diffDays === 0) return { text: `今天 ${label}`, className: "due-soon" };
  if (diffDays <= 2) return { text: `即將到期 ${label}`, className: "due-soon" };
  return { text: label, className: "muted" };
}

function priorityLabel(priority) {
  const map = {
    urgent: "緊急",
    high: "高",
    normal: "中",
    low: "低",
    none: "無優先級",
  };
  return map[priority] || priority;
}

function filteredTasks() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.tasks;
  return state.tasks.filter((task) => {
    const hay = [
      task.name,
      task.status,
      task.listName,
      task.folderName,
      task.spaceName,
      task.workspaceName,
      ...(task.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

function reorderTasks(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const fromIndex = state.tasks.findIndex((task) => task.id === fromId);
  const toIndex = state.tasks.findIndex((task) => task.id === toId);
  if (fromIndex < 0 || toIndex < 0) return;

  const next = [...state.tasks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  state.tasks = next;
  saveOrder(next.map((task) => task.id));
  render();
}

function clearDragOver() {
  els.taskList
    .querySelectorAll(".task.drag-over")
    .forEach((node) => node.classList.remove("drag-over"));
}

function render() {
  const tasks = filteredTasks();
  const canDrag = !state.query.trim();
  els.countLabel.textContent = `${tasks.length} 項任務`;
  els.updatedLabel.textContent = state.fetchedAt
    ? `更新於 ${new Date(state.fetchedAt).toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "";
  els.subtitle.textContent = state.userName
    ? `${state.userName} · 指派給我`
    : "指派給我的任務";

  els.taskList.innerHTML = "";
  els.emptyState.classList.add("hidden");
  els.errorState.classList.add("hidden");

  if (tasks.length === 0) {
    els.emptyState.classList.remove("hidden");
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const task of tasks) {
    const due = formatDue(task.dueDate);
    const button = document.createElement("button");
    button.className = "task";
    button.type = "button";
    button.dataset.taskId = task.id;
    button.draggable = canDrag;
    if (canDrag) button.title = "拖曳可調整順序；點擊開啟任務";

    button.innerHTML = `
      <div class="task-top">
        <div class="task-heading">
          <span class="drag-handle" aria-hidden="true">⋮⋮</span>
          <div class="task-name"></div>
        </div>
        <span class="chip">
          <span class="dot" style="background:${task.statusColor}"></span>
          <span class="status-text"></span>
        </span>
      </div>
      <div class="task-meta">
        <span class="chip muted list-text"></span>
        <span class="chip muted priority-text"></span>
        <span class="chip due-chip"></span>
      </div>
    `;

    button.querySelector(".task-name").textContent = task.name;
    button.querySelector(".status-text").textContent = task.status;
    button.querySelector(".list-text").textContent =
      task.listName || task.workspaceName || "未分類";
    button.querySelector(".priority-text").textContent = priorityLabel(task.priority);
    const dueChip = button.querySelector(".due-chip");
    dueChip.textContent = due.text;
    dueChip.classList.add(due.className);

    button.addEventListener("click", () => {
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      if (task.url) window.desktopBoard.openExternal(task.url);
    });

    if (canDrag) {
      button.addEventListener("dragstart", (event) => {
        dragMoved = false;
        button.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
      });

      button.addEventListener("drag", () => {
        dragMoved = true;
      });

      button.addEventListener("dragend", () => {
        button.classList.remove("dragging");
        clearDragOver();
      });

      button.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        clearDragOver();
        button.classList.add("drag-over");
      });

      button.addEventListener("dragleave", () => {
        button.classList.remove("drag-over");
      });

      button.addEventListener("drop", (event) => {
        event.preventDefault();
        button.classList.remove("drag-over");
        const fromId = event.dataTransfer.getData("text/plain");
        reorderTasks(fromId, task.id);
      });
    }

    fragment.appendChild(button);
  }
  els.taskList.appendChild(fragment);
}

function showError(message) {
  els.taskList.innerHTML = "";
  els.emptyState.classList.add("hidden");
  els.errorState.classList.remove("hidden");
  els.errorState.textContent = message;
  els.countLabel.textContent = "無法載入";
}

async function syncPinButton() {
  const pinned = await window.desktopBoard.windowControl("get-always-on-top");
  state.alwaysOnTop = Boolean(pinned);
  els.pinBtn.classList.toggle("active", state.alwaysOnTop);
  els.pinBtn.title = state.alwaysOnTop ? "取消置頂" : "置頂";
}

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value || "";
  render();
});

els.refreshBtn.addEventListener("click", async () => {
  els.refreshBtn.disabled = true;
  try {
    await window.desktopBoard.refreshTasks();
  } finally {
    els.refreshBtn.disabled = false;
  }
});

els.pinBtn.addEventListener("click", async () => {
  const pinned = await window.desktopBoard.windowControl("toggle-always-on-top");
  state.alwaysOnTop = Boolean(pinned);
  els.pinBtn.classList.toggle("active", state.alwaysOnTop);
  els.pinBtn.title = state.alwaysOnTop ? "取消置頂" : "置頂";
});

els.minimizeBtn.addEventListener("click", () => {
  window.desktopBoard.windowControl("minimize");
});

els.closeBtn.addEventListener("click", () => {
  window.desktopBoard.windowControl("close");
});

window.desktopBoard.onTasksUpdated((payload) => {
  if (!payload?.ok) {
    showError(payload?.error || "載入任務失敗");
    return;
  }

  const incoming = payload.tasks || [];
  const ordered = applyCustomOrder(incoming, loadOrder());
  state.tasks = ordered;
  saveOrder(ordered.map((task) => task.id));
  state.userName = payload.user?.username || "";
  state.fetchedAt = payload.fetchedAt || Date.now();
  render();
});

syncPinButton();
