const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const { getBrowserInstance } = require('./screenshot')

let pendingPdfBuffer = null
let pendingPdfUrl = null

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

      // Scroll through the page to trigger lazy-loaded images and video observers
      await page.evaluate(async () => {
        const distance = 300
        const delay = 150
        const totalHeight = document.body.scrollHeight
        let current = 0
        while (current < totalHeight) {
          window.scrollBy(0, distance)
          current += distance
          await new Promise(r => setTimeout(r, delay))
        }
        window.scrollTo(0, 0)
      })

      // Also force data-src lazy patterns that scroll alone won't catch
      await page.evaluate(() => {
        document.querySelectorAll('img[loading="lazy"], iframe[loading="lazy"]').forEach(el => el.setAttribute('loading', 'eager'))
        document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]').forEach(el => {
          const src = el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('data-original')
          if (src) el.setAttribute('src', src)
        })
      })

      // Wait for triggered lazy images and video sources to finish loading
      await page.waitForTimeout(2500)

      if (waitTime && waitTime > 0) {
        mainWindow.webContents.send('website-pdf-waiting', { waitTime })
        await page.waitForTimeout(waitTime)
      } else {
        await page.waitForTimeout(500)
      }

      // Replace videos — after all waits, so extra wait time benefits video loading too
      await page.evaluate(() => {
        document.querySelectorAll('video').forEach(video => {
          const poster = video.getAttribute('poster')
          const w = video.offsetWidth || 640
          const h = video.offsetHeight || 360
          if (poster) {
            const img = document.createElement('img')
            img.src = poster
            img.style.cssText = `width:${w}px;height:${h}px;object-fit:cover;display:block;`
            video.replaceWith(img)
          } else if (video.readyState >= 2) {
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            const img = document.createElement('img')
            img.style.cssText = `width:${w}px;height:${h}px;object-fit:cover;display:block;`
            try { ctx.drawImage(video, 0, 0, w, h) } catch (e) {}
            img.src = canvas.toDataURL()
            video.replaceWith(img)
          } else {
            // Not loaded in time — hide wrapper
            let el = video
            while (el.parentElement) {
              const parent = el.parentElement
              const siblings = Array.from(parent.children).filter(c => c !== el)
              const hasContent = siblings.some(c => c.textContent.trim().length > 0 || c.querySelector('img, video, canvas'))
              if (hasContent) break
              el = parent
            }
            el.style.setProperty('display', 'none', 'important')
          }
        })
      })

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

      // Remove artificial height/min-height from body and common wrappers to prevent blank space after footer
      await page.evaluate(() => {
        const selectors = ['body', 'html', '#__next', '#root', '#app', 'main', '[data-reactroot]']
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            el.style.setProperty('height', 'auto', 'important')
            el.style.setProperty('min-height', '0', 'important')
          })
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

      pendingPdfBuffer = pdfBuffer
      pendingPdfUrl = url
      return { ok: true }
    } finally {
      await context.close()
    }
  })

  ipcMain.handle('website-pdf-save', async () => {
    if (!pendingPdfBuffer) return { canceled: true }

    let suggested = 'webpage.pdf'
    try {
      suggested = new URL(pendingPdfUrl).hostname.replace(/^www\./, '') + '.pdf'
    } catch {}

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF',
      defaultPath: suggested,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { canceled: true }
    fs.writeFileSync(filePath, pendingPdfBuffer)
    pendingPdfBuffer = null
    pendingPdfUrl = null
    return { canceled: false, filePath }
  })
}

module.exports = { registerWebsitePdfHandlers }
