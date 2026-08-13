const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBoard", {
  refreshTasks: () => ipcRenderer.invoke("refresh-tasks"),
  windowControl: (action) => ipcRenderer.invoke("window-control", action),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getTaskOrder: () => ipcRenderer.invoke("get-task-order"),
  saveTaskOrder: (ids) => ipcRenderer.invoke("save-task-order", ids),
  onTasksUpdated: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("tasks-updated", listener);
    return () => ipcRenderer.removeListener("tasks-updated", listener);
  },
});
