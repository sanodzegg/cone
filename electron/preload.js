const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  convert: (buffer, targetFormat, quality) => ipcRenderer.invoke('convert-file', buffer, targetFormat, quality),
})
