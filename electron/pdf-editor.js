const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')
const { PDFDocument, degrees, rgb, StandardFonts, PDFName } = require('pdf-lib')

let editorBuffer = null

function registerPdfEditorHandlers(mainWindow) {
  ipcMain.handle('pdf-editor-pick-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Open PDF',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    })
    if (canceled || !filePaths.length) return { canceled: true }
    const fp = filePaths[0]
    return {
      canceled: false,
      path: fp,
      name: path.basename(fp),
      size: fs.statSync(fp).size,
    }
  })

  ipcMain.handle('pdf-editor-read-file', async (_e, filePath) => {
    const buf = fs.readFileSync(filePath)
    editorBuffer = buf
    return Array.from(buf)
  })

  ipcMain.handle('pdf-editor-page-ops', async (_e, { filePath, ops }) => {
    try {
      const src = editorBuffer ?? fs.readFileSync(filePath)
      const srcDoc = await PDFDocument.load(src)
      const newDoc = await PDFDocument.create()

      // ops is an array describing the final page order with mutations:
      // [{ srcIndex: number, rotation: number }]
      for (const op of ops) {
        const [copied] = await newDoc.copyPages(srcDoc, [op.srcIndex])
        if (op.rotation !== 0) {
          const current = copied.getRotation().angle
          copied.setRotation(degrees((current + op.rotation) % 360))
        }
        newDoc.addPage(copied)
      }

      editorBuffer = await newDoc.save()
      return { success: true, pageCount: newDoc.getPageCount() }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('pdf-editor-save', async () => {
    if (!editorBuffer) return { canceled: true }
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF',
      defaultPath: 'edited.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    fs.writeFileSync(filePath, editorBuffer)
    return { canceled: false, filePath }
  })

  ipcMain.handle('pdf-editor-reset', () => {
    editorBuffer = null
    return { ok: true }
  })

  // ── Watermark ────────────────────────────────────────────────────────────────
  ipcMain.handle('pdf-editor-watermark', async (_e, { filePath, watermark }) => {
    try {
      const src = editorBuffer ?? fs.readFileSync(filePath)
      const doc = await PDFDocument.load(src)
      const pages = doc.getPages()

      const targetPages = watermark.pages === 'all'
        ? pages
        : (watermark.pages ?? []).map(i => pages[i]).filter(Boolean)

      if (watermark.type === 'text') {
        const font = await doc.embedFont(StandardFonts.HelveticaBold)
        const fontSize = watermark.fontSize ?? 48
        const opacity = (watermark.opacity ?? 50) / 100
        const rotationAngle = watermark.rotation ?? 45
        const [r, g, b] = hexToRgb(watermark.color ?? '#000000')

        for (const page of targetPages) {
          const { width, height } = page.getSize()
          const text = watermark.text ?? 'WATERMARK'
          const textWidth = font.widthOfTextAtSize(text, fontSize)
          const textHeight = font.heightAtSize(fontSize)

          page.drawText(text, {
            x: (width - textWidth) / 2,
            y: (height - textHeight) / 2,
            size: fontSize,
            font,
            color: rgb(r, g, b),
            opacity,
            rotate: degrees(rotationAngle),
          })
        }
      } else if (watermark.type === 'image' && watermark.imageBytes) {
        const imgBytes = new Uint8Array(watermark.imageBytes)
        const opacity = (watermark.opacity ?? 50) / 100
        const scale = (watermark.scale ?? 30) / 100

        let image
        try { image = await doc.embedPng(imgBytes) } catch {
          image = await doc.embedJpg(imgBytes)
        }

        for (const page of targetPages) {
          const { width, height } = page.getSize()
          const imgW = image.width * scale
          const imgH = image.height * scale
          page.drawImage(image, {
            x: (width - imgW) / 2,
            y: (height - imgH) / 2,
            width: imgW,
            height: imgH,
            opacity,
          })
        }
      }

      editorBuffer = await doc.save()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ── Form fields ──────────────────────────────────────────────────────────────
  ipcMain.handle('pdf-editor-get-form-fields', async (_e, filePath) => {
    try {
      const src = editorBuffer ?? fs.readFileSync(filePath)
      const doc = await PDFDocument.load(src)
      const form = doc.getForm()
      const fields = form.getFields().map(field => {
        const name = field.getName()
        const type = field.constructor.name
          .replace('PDF', '')
          .replace('Field', '')
          .toLowerCase()
        let value = null
        try {
          if (type === 'text') value = form.getTextField(name).getText() ?? ''
          else if (type === 'checkbox') value = form.getCheckBox(name).isChecked() ? 'true' : 'false'
          else if (type === 'dropdown') value = form.getDropdown(name).getSelected()[0] ?? ''
          else if (type === 'radiogroup') value = form.getRadioGroup(name).getSelected() ?? ''
        } catch {}
        return { name, type, value }
      })
      return { success: true, fields }
    } catch (e) {
      return { success: false, error: e.message, fields: [] }
    }
  })

  ipcMain.handle('pdf-editor-fill-forms', async (_e, { filePath, fields }) => {
    try {
      const src = editorBuffer ?? fs.readFileSync(filePath)
      const doc = await PDFDocument.load(src)
      const form = doc.getForm()

      for (const { name, type, value } of fields) {
        try {
          if (type === 'text') form.getTextField(name).setText(value ?? '')
          else if (type === 'checkbox') {
            const cb = form.getCheckBox(name)
            value === 'true' ? cb.check() : cb.uncheck()
          } else if (type === 'dropdown') form.getDropdown(name).select(value ?? '')
          else if (type === 'radiogroup') form.getRadioGroup(name).select(value ?? '')
        } catch {}
      }

      editorBuffer = await doc.save()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ── Burn annotations ─────────────────────────────────────────────────────────
  ipcMain.handle('pdf-editor-burn-annotations', async (_e, { filePath, pages: pageData }) => {
    try {
      const src = editorBuffer ?? fs.readFileSync(filePath)
      const doc = await PDFDocument.load(src)
      const pdfPages = doc.getPages()

      for (const pd of pageData) {
        const page = pdfPages[pd.pageNum - 1]
        if (!page) continue
        const { width: pW, height: pH } = page.getSize()

        for (const ann of pd.annotations) {
          if (ann.kind === 'highlight') {
            const [r, g, b] = hexToRgb(ann.color)
            // pdf-lib y-axis is bottom-up; convert from top-down percentage
            const x = ann.x * pW
            const w = ann.w * pW
            // handle negative width (right-to-left drag)
            const rx = w < 0 ? x + w : x
            const rw = Math.abs(w)
            const rh = Math.abs(ann.h * pH)
            const y = pH - (ann.y * pH) - rh  // flip y
            page.drawRectangle({
              x: rx, y,
              width: rw, height: rh,
              color: rgb(r, g, b),
              opacity: ann.opacity,
            })
          } else if (ann.kind === 'draw') {
            if (ann.points.length < 2) continue
            const [r, g, b] = hexToRgb(ann.color)
            const lw = ann.strokeWidth * pW
            // Draw as series of lines
            for (let i = 1; i < ann.points.length; i++) {
              const x1 = ann.points[i - 1].x * pW
              const y1 = pH - ann.points[i - 1].y * pH
              const x2 = ann.points[i].x * pW
              const y2 = pH - ann.points[i].y * pH
              page.drawLine({
                start: { x: x1, y: y1 },
                end: { x: x2, y: y2 },
                thickness: lw,
                color: rgb(r, g, b),
              })
            }
          } else if (ann.kind === 'arrow') {
            const [r, g, b] = hexToRgb(ann.color)
            const lw = ann.strokeWidth * pW
            const x1 = ann.x1 * pW, y1 = pH - ann.y1 * pH
            const x2 = ann.x2 * pW, y2 = pH - ann.y2 * pH
            page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: lw, color: rgb(r, g, b) })
            // Arrowhead lines
            const angle = Math.atan2(y2 - y1, x2 - x1)
            const headLen = Math.max(lw * 4, 8)
            const a1 = angle + Math.PI * 5 / 6
            const a2 = angle - Math.PI * 5 / 6
            page.drawLine({
              start: { x: x2, y: y2 },
              end: { x: x2 + headLen * Math.cos(a1), y: y2 + headLen * Math.sin(a1) },
              thickness: lw, color: rgb(r, g, b),
            })
            page.drawLine({
              start: { x: x2, y: y2 },
              end: { x: x2 + headLen * Math.cos(a2), y: y2 + headLen * Math.sin(a2) },
              thickness: lw, color: rgb(r, g, b),
            })
          } else if (ann.kind === 'text') {
            const [r, g, b] = hexToRgb(ann.color)
            const font = await doc.embedFont(StandardFonts.Helvetica)
            const fontSize = ann.fontSize * pH
            const x = ann.x * pW
            const y = pH - ann.y * pH - fontSize  // align baseline
            page.drawText(ann.text, { x, y, size: fontSize, font, color: rgb(r, g, b) })
          }
        }
      }

      editorBuffer = await doc.save()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
}

module.exports = { registerPdfEditorHandlers }
