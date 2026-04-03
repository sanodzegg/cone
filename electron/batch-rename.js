const { ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

function collectFiles(dir) {
  const results = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile()) {
      results.push({ name: entry.name, dir })
    }
  }
  return results
}

function applyRules(name, rules) {
  const ext = path.extname(name)
  let base = path.basename(name, ext)

  if (rules.find) {
    const flags = rules.caseSensitive ? 'g' : 'gi'
    const escaped = rules.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    base = base.replace(new RegExp(escaped, flags), rules.replace ?? '')
  }

  if (rules.prefix) base = rules.prefix + base
  if (rules.suffix) base = base + rules.suffix

  if (rules.caseMode === 'lower') base = base.toLowerCase()
  else if (rules.caseMode === 'upper') base = base.toUpperCase()

  return base + ext
}

function buildPreview(files, rules) {
  const seen = new Map()
  return files.map((file, i) => {
    let newName = applyRules(file.name, rules)

    if (rules.sequential) {
      const ext = path.extname(newName)
      const base = path.basename(newName, ext)
      const pad = String(i + (rules.startAt ?? 1)).padStart(rules.padding ?? 1, '0')
      const sep = rules.seqSeparator ?? '_'
      newName = rules.seqPosition === 'prefix'
        ? pad + sep + base + ext
        : base + sep + pad + ext
    }

    // Deduplicate
    const ext = path.extname(newName)
    const base = path.basename(newName, ext)
    let candidate = newName
    let counter = 2
    while (seen.has(candidate.toLowerCase())) {
      candidate = base + '_' + counter + ext
      counter++
    }
    newName = candidate
    seen.set(newName.toLowerCase(), true)

    return { original: file.name, newName, dir: file.dir, changed: file.name !== newName }
  })
}

function registerBatchRenameHandlers() {
  ipcMain.handle('batch-rename-pick-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (canceled) return null
    return filePaths[0]
  })

  ipcMain.handle('batch-rename-scan', async (_event, { folderPath }) => {
    const files = collectFiles(folderPath)
    return files
  })

  ipcMain.handle('batch-rename-preview', async (_event, { files, rules }) => {
    return buildPreview(files, rules)
  })

  ipcMain.handle('batch-rename-apply', async (_event, { preview }) => {
    const results = []
    for (const item of preview) {
      if (!item.changed) { results.push({ ok: true, original: item.original }); continue }
      const oldPath = path.join(item.dir, item.original)
      const newPath = path.join(item.dir, item.newName)
      try {
        fs.renameSync(oldPath, newPath)
        results.push({ ok: true, original: item.original, newName: item.newName })
      } catch (err) {
        results.push({ ok: false, original: item.original, newName: item.newName, error: err.message })
      }
    }
    return results
  })
}

module.exports = { registerBatchRenameHandlers }
