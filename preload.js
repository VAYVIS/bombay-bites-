const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sessionStore', {
  get: () => ipcRenderer.invoke('session:get'),
  set: (session) => ipcRenderer.invoke('session:set', session),
  clear: () => ipcRenderer.invoke('session:clear'),
});

contextBridge.exposeInMainWorld('electronAPI', {
  navigate: (page) => ipcRenderer.send('navigate', page),
});