const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const { getBrowserInstance } = require('./screenshot')

function registerWebsitePdfHandlers(mainWindow) {
  ipcMain.handle('website-pdf-generate', async (_event, {
    url,
    viewportWidth,
    format,
    orientation,
    marginTop, marginBottom, marginLeft, marginRight,
    printBackground,
    waitUntil,
    waitTime,
  }) => {
    const browser = await getBrowserInstance(mainWindow)
    if (!browser) throw new Error('Browser not available')

    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: 900 },
    })
    const page = await context.newPage()

    await page.route('**/*', (route) => {
      const reqUrl = route.request().url()
      if (/google-analytics|googletagmanager|facebook\.net|hotjar|intercom|crisp\.chat|tawk\.to|drift\.com|octocom\.ai|tidio|freshchat|hubspot|userlike|zendesk/.test(reqUrl)) {
        return route.abort()
      }
      return route.continue()
    })

    try {
      await page.goto(url, { waitUntil: waitUntil ?? 'networkidle', timeout: 60000 + (waitTime ?? 0) })

      if (waitTime && waitTime > 0) {
        mainWindow.webContents.send('website-pdf-waiting', { waitTime })
        await page.waitForTimeout(waitTime)
      } else {
        await page.waitForTimeout(500)
      }

      await page.emulateMedia({ media: 'print' })

      // Hide fixed/sticky elements — they repeat on every page break in Chromium
      await page.evaluate(() => {
        document.querySelectorAll('*').forEach(el => {
          // Hide shadow DOM chat/widget host elements by tag name
          const tag = el.tagName.toLowerCase()
          if (el.shadowRoot || /chat|widget|launcher|bot|beacon|helpscout|intercom|crisp|drift|tawk|tidio|freshchat/.test(tag)) {
            el.style.setProperty('display', 'none', 'important')
            return
          }
          const cs = window.getComputedStyle(el)
          if (cs.position === 'fixed' || cs.position === 'sticky') {
            el.style.setProperty('display', 'none', 'important')
          }
        })
      })

      // Strip box-shadow and filter — Chromium renders these as colored blocks at page breaks
      // Also suppress known chat/support widgets that survive fixed-element hiding
      await page.addStyleTag({
        content: `
          * { box-shadow: none !important; filter: none !important; text-shadow: none !important; }
          #intercom-container, #intercom-frame, .intercom-lightweight-app,
          [id^="hubspot"], .hs-chat-widget,
          #crisp-chatbox, .crisp-client,
          #drift-widget, .drift-frame-controller,
          .tawk-min-container, #tidio-chat,
          #fc_widget, .freshchat-widget { display: none !important; }
        `
      })

      const pdfBuffer = await page.pdf({
        format: format ?? 'A4',
        landscape: orientation === 'landscape',
        printBackground: printBackground ?? true,
        margin: {
          top: `${marginTop ?? 10}mm`,
          bottom: `${marginBottom ?? 10}mm`,
          left: `${marginLeft ?? 10}mm`,
          right: `${marginRight ?? 10}mm`,
        },
      })

      return { buffer: Array.from(pdfBuffer) }
    } finally {
      await context.close()
    }
  })

  ipcMain.handle('website-pdf-save', async (_event, { buffer, url }) => {
    let suggested = 'webpage.pdf'
    try {
      suggested = new URL(url).hostname.replace(/^www\./, '') + '.pdf'
    } catch {}

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF',
      defaultPath: suggested,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return { canceled: false, filePath }
  })
}

module.exports = { registerWebsitePdfHandlers }
