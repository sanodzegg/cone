const { ipcMain } = require('electron')
const sharp = require('sharp')

function registerConvertHandlers() {
  ipcMain.handle('convert-file', async (_event, buffer, targetFormat, quality = 60) => {
    const result = await sharp(Buffer.from(buffer)).toFormat(targetFormat, { quality }).toBuffer()
    return result
  })
}

module.exports = { registerConvertHandlers }
