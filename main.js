const { app, BrowserWindow, ipcMain, Notification, screen, shell } = require('electron')
const path = require('path')

// Register deep link protocol for OAuth callbacks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('cone', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('cone')
}
const { registerConvertHandlers } = require('./electron/convert')
const { registerBulkConvertHandlers } = require('./electron/bulk-convert')
const { registerScreenshotHandlers } = require('./electron/screenshot')
const { registerPdfToolsHandlers } = require('./electron/pdf-tools')
const { registerWebsitePdfHandlers } = require('./electron/website-pdf')
const { registerFileSaveHandlers } = require('./electron/file-save')
const { registerBatchRenameHandlers } = require('./electron/batch-rename')
const { registerLighthouseHandlers } = require('./electron/lighthouse')
const { registerPdfEditorHandlers } = require('./electron/pdf-editor')

const isDev = !app.isPackaged

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

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

ipcMain.handle('open-external', (_e, url) => {
  shell.openExternal(url)
})

// Handle OAuth deep link callback (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('oauth-callback', url)
    mainWindow.focus()
  }
})

// Handle OAuth deep link callback (Windows — second instance)
app.on('second-instance', (_event, argv) => {
  const url = argv.find(arg => arg.startsWith('cone://'))
  if (url && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('oauth-callback', url)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
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
  registerLighthouseHandlers(mainWindow)
  registerPdfEditorHandlers(mainWindow)
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
