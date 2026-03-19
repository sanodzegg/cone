const { ipcMain, app } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { randomUUID } = require('crypto')

// In production, sharp must be loaded from the unpacked asar directory
const sharpPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sharp')
  : 'sharp'
const sharp = require(sharpPath)

// ffmpeg-static binary path (unpacked from asar in production)
const ffmpegStaticPath = app.isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg')
  : require('ffmpeg-static')
const ffmpeg = require('fluent-ffmpeg')

const pdfParse = require('pdf-parse')
const { Document, Packer, Paragraph, TextRun } = require('docx')
const mammoth = require('mammoth')
const PDFDocument = require('pdfkit')

async function extractText(buffer, sourceFormat) {
  switch (sourceFormat) {
    case 'pdf': {
      const data = await pdfParse(buffer)
      return data.text
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    }
    case 'txt':
      return buffer.toString('utf-8')
    default:
      throw new Error(`Cannot extract text from format: ${sourceFormat}`)
  }
}

async function textToPdf(text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks = []
    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.font('Helvetica').fontSize(11)
    text.split('\n').forEach(line => doc.text(line || ' '))
    doc.end()
  })
}

async function textToDocx(text) {
  const paragraphs = text.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] }))
  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBuffer(doc)
}

function registerConvertHandlers() {
  ipcMain.handle('convert-file', async (_event, buffer, targetFormat, quality = 60) => {
    const result = await sharp(Buffer.from(buffer)).toFormat(targetFormat, { quality }).toBuffer()
    return result
  })

  ipcMain.handle('convert-document', async (_event, buffer, targetFormat, sourceFormat) => {
    const buf = Buffer.from(buffer)
    const text = await extractText(buf, sourceFormat)

    if (targetFormat === 'txt') return Buffer.from(text, 'utf-8')
    if (targetFormat === 'pdf') return textToPdf(text)
    if (targetFormat === 'docx') return textToDocx(text)

    throw new Error(`Unsupported target format: ${targetFormat}`)
  })

  ipcMain.handle('convert-video', async (_event, buffer, sourceExt, targetFormat) => {
    const tmpDir = os.tmpdir()
    const inputPath = path.join(tmpDir, `${randomUUID()}.${sourceExt}`)
    const outputPath = path.join(tmpDir, `${randomUUID()}.${targetFormat}`)

    fs.writeFileSync(inputPath, Buffer.from(buffer))

    try {
      await new Promise((resolve, reject) => {
        const cmd = ffmpeg(inputPath).setFfmpegPath(ffmpegStaticPath)

        if (targetFormat === 'gif') {
          cmd
            .fps(15)
            .size('640x?')
            .output(outputPath)
        } else {
          cmd.output(outputPath)
        }

        cmd.on('end', resolve).on('error', reject).run()
      })

      const result = fs.readFileSync(outputPath)
      return result
    } finally {
      fs.rmSync(inputPath, { force: true })
      fs.rmSync(outputPath, { force: true })
    }
  })
}

module.exports = { registerConvertHandlers }
