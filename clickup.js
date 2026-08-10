const CLICKUP_API = "https://api.clickup.com/api/v2";

function getToken() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error(
      "找不到環境變數 CLICKUP_API_TOKEN。請設定後重新啟動應用程式。"
    );
  }
  return token;
}

async function clickupFetch(pathname) {
  const response = await fetch(`${CLICKUP_API}${pathname}`, {
    headers: {
      Authorization: getToken(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ClickUp API ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

function isHoldStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase() === "hold";
}

function mapTask(task) {
  return {
    id: task.id,
    name: task.name || "(未命名任務)",
    status: task.status?.status || "unknown",
    statusColor: task.status?.color || "#6b7280",
    priority: task.priority?.priority || "none",
    priorityColor: task.priority?.color || null,
    dueDate: task.due_date ? Number(task.due_date) : null,
    url: task.url,
    listName: task.list?.name || "",
    spaceName: task.space?.name || "",
    folderName: task.folder?.name || "",
    tags: Array.isArray(task.tags)
      ? task.tags.map((tag) => tag.name).filter(Boolean)
      : [],
  };
}

function sortTasks(tasks) {
  const priorityRank = { urgent: 0, high: 1, normal: 2, low: 3, none: 4 };
  return [...tasks].sort((a, b) => {
    const pa = priorityRank[a.priority] ?? 4;
    const pb = priorityRank[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;

    if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.name.localeCompare(b.name, "zh-Hant");
  });
}

async function fetchTeamTasks(teamId, userId) {
  const tasks = [];
  let page = 0;

  while (page < 20) {
    const query = new URLSearchParams({
      "assignees[]": String(userId),
      include_closed: "false",
      subtasks: "true",
      page: String(page),
    });

    const data = await clickupFetch(`/team/${teamId}/task?${query}`);
    const batch = Array.isArray(data.tasks) ? data.tasks : [];
    tasks.push(
      ...batch.map(mapTask).filter((task) => !isHoldStatus(task.status))
    );

    if (data.last_page === true || batch.length === 0) break;
    page += 1;
  }

  return tasks;
}

async function fetchAssignedTasks() {
  const userData = await clickupFetch("/user");
  const user = userData.user;
  if (!user?.id) throw new Error("無法取得 ClickUp 使用者資訊。");

  const teamsData = await clickupFetch("/team");
  const teams = Array.isArray(teamsData.teams) ? teamsData.teams : [];
  if (teams.length === 0) throw new Error("找不到任何 ClickUp Workspace。");

  const nested = await Promise.all(
    teams.map(async (team) => {
      const tasks = await fetchTeamTasks(team.id, user.id);
      return tasks.map((task) => ({
        ...task,
        workspaceName: team.name || "",
      }));
    })
  );

  const merged = sortTasks(nested.flat());
  const unique = [];
  const seen = new Set();
  for (const task of merged) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    unique.push(task);
  }

  return {
    user: {
      id: user.id,
      username: user.username || user.email || "You",
    },
    tasks: unique,
    fetchedAt: Date.now(),
  };
}

module.exports = { fetchAssignedTasks };
