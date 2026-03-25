const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const path = require('path')
const { registerConvertHandlers } = require('./electron/convert')
const { registerBulkConvertHandlers } = require('./electron/bulk-convert')
const { registerScreenshotHandlers } = require('./electron/screenshot')
const { registerPdfToolsHandlers } = require('./electron/pdf-tools')
const { registerWebsitePdfHandlers } = require('./electron/website-pdf')

const isDev = !app.isPackaged

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'build-assets/icon.icns'),
    webPreferences: {
      devTools: isDev,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron/preload.js'),
    },
    resizable: false,
    backgroundColor: '#09090b',
  })

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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})
