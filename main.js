const { app, BrowserWindow, ipcMain, Notification, screen } = require('electron')
const path = require('path')
const { registerConvertHandlers } = require('./electron/convert')
const { registerBulkConvertHandlers } = require('./electron/bulk-convert')
const { registerScreenshotHandlers } = require('./electron/screenshot')
const { registerPdfToolsHandlers } = require('./electron/pdf-tools')
const { registerWebsitePdfHandlers } = require('./electron/website-pdf')
const { registerFileSaveHandlers } = require('./electron/file-save')
const { registerBatchRenameHandlers } = require('./electron/batch-rename')

const isDev = !app.isPackaged

let mainWindow = null

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
  const width = Math.min(Math.max(Math.round(sw * 0.8), 1100), 1800)
  const height = Math.min(Math.max(Math.round(sh * 0.95), 720), 1200)

  mainWindow = new BrowserWindow({
    width,
    height,
    icon: path.join(__dirname, 'build-assets/icon.icns'),
    webPreferences: {
      devTools: isDev,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron/preload.js'),
    },
    resizable: false,
    vibrancy: 'fullscreen-ui',
    backgroundMaterial: 'acrylic'
  })

  mainWindow.on('closed', () => { mainWindow = null })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }

}

ipcMain.on('show-notification', (_e, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
})

app.whenReady().then(() => {
  createWindow()
  registerConvertHandlers()
  registerBulkConvertHandlers(mainWindow)
  registerScreenshotHandlers(mainWindow)
  registerPdfToolsHandlers(mainWindow)
  registerWebsitePdfHandlers(mainWindow)
  registerFileSaveHandlers(mainWindow)
  registerBatchRenameHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})
