const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  convert: (buffer, targetFormat, quality, imageOptions) => ipcRenderer.invoke('convert-file', buffer, targetFormat, quality, imageOptions),
  convertDocument: (buffer, targetFormat, sourceFormat) => ipcRenderer.invoke('convert-document', buffer, targetFormat, sourceFormat),
  convertVideo: (buffer, sourceExt, targetFormat, videoOptions) => ipcRenderer.invoke('convert-video', buffer, sourceExt, targetFormat, videoOptions),
  convertFavicon: (buffer) => ipcRenderer.invoke('convert-favicon', buffer),

  // Bulk converter
  bulkPickFolder: () => ipcRenderer.invoke('bulk-pick-folder'),
  bulkScanFolder: (opts) => ipcRenderer.invoke('bulk-scan-folder', opts),
  bulkConvertFolder: (opts) => ipcRenderer.invoke('bulk-convert-folder', opts),
  bulkWatchStart: (opts) => ipcRenderer.invoke('bulk-watch-start', opts),
  bulkWatchStop: (folderPath) => ipcRenderer.invoke('bulk-watch-stop', folderPath),
  onBulkProgress: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('bulk-convert-progress', handler)
    return () => ipcRenderer.removeListener('bulk-convert-progress', handler)
  },
  onBulkWatchConverted: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('bulk-watch-converted', handler)
    return () => ipcRenderer.removeListener('bulk-watch-converted', handler)
  },

  // Website screenshot
  screenshotEnsureBrowser: () => ipcRenderer.invoke('screenshot-ensure-browser'),
  screenshotCapture: (opts) => ipcRenderer.invoke('screenshot-capture', opts),
  screenshotSave: (opts) => ipcRenderer.invoke('screenshot-save', opts),
  onScreenshotBrowserStatus: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('screenshot-browser-status', handler)
    return () => ipcRenderer.removeListener('screenshot-browser-status', handler)
  },
})
