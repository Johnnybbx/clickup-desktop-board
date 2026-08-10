const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBoard", {
  refreshTasks: () => ipcRenderer.invoke("refresh-tasks"),
  windowControl: (action) => ipcRenderer.invoke("window-control", action),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  onTasksUpdated: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("tasks-updated", listener);
    return () => ipcRenderer.removeListener("tasks-updated", listener);
  },
});
