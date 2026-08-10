const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const { fetchAssignedTasks } = require("./clickup");

const APP_ID = "com.clickup.desktopboard";
const ICON_PATH = path.join(__dirname, "assets", "icon.ico");

let mainWindow = null;
let tray = null;
let refreshTimer = null;

const REFRESH_MS = 60_000;

if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

function getAppIcon() {
  const icon = nativeImage.createFromPath(ICON_PATH);
  return icon.isEmpty() ? undefined : icon;
}

function createWindow() {
  const icon = getAppIcon();
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 360,
    minHeight: 480,
    alwaysOnTop: true,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    backgroundColor: "#12161c",
    title: "ClickUp Desktop Board",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = getAppIcon() || nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("ClickUp Desktop Board");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "顯示視窗",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: "重新整理",
        click: () => refreshTasks(),
      },
      { type: "separator" },
      {
        label: "結束",
        click: () => app.quit(),
      },
    ])
  );
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function refreshTasks() {
  try {
    const data = await fetchAssignedTasks();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tasks-updated", { ok: true, ...data });
    }
  } catch (error) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("tasks-updated", {
        ok: false,
        error: error.message || String(error),
      });
    }
  }
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshTasks, REFRESH_MS);
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  refreshTasks();
  startAutoRefresh();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("refresh-tasks", async () => {
  await refreshTasks();
  return true;
});

ipcMain.handle("window-control", (_event, action) => {
  if (!mainWindow) return;
  if (action === "minimize") mainWindow.minimize();
  if (action === "close") mainWindow.hide();
  if (action === "toggle-always-on-top") {
    const next = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next);
    return next;
  }
  if (action === "get-always-on-top") {
    return mainWindow.isAlwaysOnTop();
  }
});

ipcMain.handle("open-external", async (_event, url) => {
  if (typeof url === "string" && url.startsWith("https://")) {
    await shell.openExternal(url);
  }
});
