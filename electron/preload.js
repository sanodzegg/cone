const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  convert: (buffer, targetFormat, quality) => ipcRenderer.invoke('convert-file', buffer, targetFormat, quality),
  convertDocument: (buffer, targetFormat, sourceFormat) => ipcRenderer.invoke('convert-document', buffer, targetFormat, sourceFormat),
  convertVideo: (buffer, sourceExt, targetFormat) => ipcRenderer.invoke('convert-video', buffer, sourceExt, targetFormat),
})
