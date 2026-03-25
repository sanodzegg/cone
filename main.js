const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, nativeImage } = require('electron')
const path = require('path')
const { registerConvertHandlers } = require('./electron/convert')
const { registerBulkConvertHandlers } = require('./electron/bulk-convert')
const { registerScreenshotHandlers } = require('./electron/screenshot')
const { registerPdfToolsHandlers } = require('./electron/pdf-tools')
const { registerWebsitePdfHandlers } = require('./electron/website-pdf')

const isDev = !app.isPackaged

let mainWindow = null
let tray = null

function isWindowHidden() {
  return !mainWindow || !mainWindow.isVisible() || mainWindow.isMinimized()
}

function createTray() {
  const iconPath = path.join(__dirname, 'build-assets/tray.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon)
  tray.setToolTip('Cone')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Quit', click: () => app.quit() },
  ]))

  tray.on('click', () => {
    if (!mainWindow) return
    if (isWindowHidden()) mainWindow.show()
    mainWindow.focus()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'build-assets/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron/preload.js'),
    },
    resizable: false,
    backgroundColor: '#09090b',
  })

  // Hide to tray instead of closing
  mainWindow.on('close', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  }
}

// Show notification only when window is hidden
ipcMain.on('show-notification', (_e, { title, body }) => {
  if (!isWindowHidden()) return
  if (Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
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
