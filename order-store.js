const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getOrderPath() {
  return path.join(app.getPath("userData"), "task-order.json");
}

function normalizeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id) => typeof id === "string" && id.trim());
}

function loadTaskOrder() {
  try {
    const raw = fs.readFileSync(getOrderPath(), "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return normalizeIds(data);
    return normalizeIds(data?.order);
  } catch {
    return [];
  }
}

function saveTaskOrder(ids) {
  const order = normalizeIds(ids);
  const payload = {
    order,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.dirname(getOrderPath()), { recursive: true });
  fs.writeFileSync(getOrderPath(), JSON.stringify(payload, null, 2), "utf8");
  return order;
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

module.exports = {
  getOrderPath,
  loadTaskOrder,
  saveTaskOrder,
  applyCustomOrder,
};
