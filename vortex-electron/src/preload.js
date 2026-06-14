const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  openFolder:     (path)               => ipcRenderer.invoke('open-folder', path),
  saveFile:       (filePath, content)  => ipcRenderer.invoke('save-file', { filePath, content }),
  getProjectsDir: ()                   => ipcRenderer.invoke('get-projects-dir'),
  getBuildsDir:   ()                   => ipcRenderer.invoke('get-builds-dir'),
  isElectron:     true,
})
