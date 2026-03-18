const { ipcMain, app } = require('electron')
const path = require('path')

// In production, sharp must be loaded from the unpacked asar directory
const sharpPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sharp')
  : 'sharp'
const sharp = require(sharpPath)

function registerConvertHandlers() {
  ipcMain.handle('convert-file', async (_event, buffer, targetFormat, quality = 60) => {
    const result = await sharp(Buffer.from(buffer)).toFormat(targetFormat, { quality }).toBuffer()
    return result
  })
}

module.exports = { registerConvertHandlers }
