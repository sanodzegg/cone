import { useState, useEffect, useRef } from 'react'
import { useConvertStore } from '@/store/useConvertStore'

export type OutputMode = 'alongside' | 'subfolder' | 'custom'

export interface ConvertedFile extends BulkFileResult {
  id: string
}

export interface BulkState {
  folderPath: string | null
  scannedCount: number
  sameFormatCount: number
  status: 'idle' | 'scanning' | 'converting' | 'done'
  files: ConvertedFile[]
  progress: { done: number; total: number }
  watching: boolean
  // settings
  targetFormat: string
  quality: number
  outputMode: OutputMode
  deleteOriginal: boolean
}

const INITIAL: BulkState = {
  folderPath: null,
  scannedCount: 0,
  sameFormatCount: 0,
  status: 'idle',
  files: [],
  progress: { done: 0, total: 0 },
  watching: false,
  targetFormat: 'webp',
  quality: 80,
  outputMode: 'alongside',
  deleteOriginal: false,
}

let idCounter = 0
const uid = () => String(++idCounter)

export function useBulkConverter(onConversionSuccess?: (engineId: string) => void) {
  const [state, setState] = useState<BulkState>(INITIAL)
  const watchCleanupRef = useRef<(() => void) | null>(null)
  const defaultOutputFolder = useConvertStore(s => s.defaultOutputFolder)

  // Subscribe to watch events
  useEffect(() => {
    const unsub = window.electron.onBulkWatchConverted((data) => {
      setState(s => ({
        ...s,
        files: [{ ...data, id: uid() }, ...s.files],
      }))
      if (data.ok) onConversionSuccess?.('image')
    })
    return unsub
  }, [])

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (state.folderPath && state.watching) {
        window.electron.bulkWatchStop(state.folderPath)
      }
      watchCleanupRef.current?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pickFolder = async () => {
    const folderPath = await window.electron.bulkPickFolder()
    if (!folderPath) return

    setState(s => ({ ...s, folderPath, status: 'scanning', files: [], scannedCount: 0 }))

    const currentFormat = state.targetFormat
    const images = await window.electron.bulkScanFolder({ folderPath, targetFormat: currentFormat })
    const convertible = images.filter((f: { sameFormat: boolean }) => !f.sameFormat)
    const sameFormat = images.filter((f: { sameFormat: boolean }) => f.sameFormat)
    setState(s => ({ ...s, scannedCount: convertible.length, sameFormatCount: sameFormat.length, status: 'idle' }))
  }

  const startConvert = async () => {
    if (!state.folderPath) return

    setState(s => ({ ...s, status: 'converting', files: [], progress: { done: 0, total: 0 }, sameFormatCount: 0 }))

    const opts: BulkConvertOptions = {
      folderPath: state.folderPath,
      targetFormat: state.targetFormat,
      quality: state.quality,
      outputMode: state.outputMode === 'custom' ? 'alongside' : state.outputMode,
      deleteOriginal: state.deleteOriginal,
      customOutputFolder: state.outputMode === 'custom' ? (defaultOutputFolder ?? undefined) : undefined,
    }

    // Subscribe to progress events for the progress bar only
    const unsub = window.electron.onBulkProgress(({ done, total }) => {
      setState(s => ({ ...s, progress: { done, total } }))
    })
    watchCleanupRef.current = unsub

    const results = await window.electron.bulkConvertFolder(opts)

    unsub()

    setState(s => ({
      ...s,
      status: 'done',
      scannedCount: results.length,
      progress: { done: results.length, total: results.length },
      files: [...results.map(r => ({ ...r, id: uid() }))],
    }))

    const successCount = results.filter((r: { ok: boolean }) => r.ok).length
    for (let i = 0; i < successCount; i++) onConversionSuccess?.('image')
  }

  const toggleWatch = async () => {
    if (!state.folderPath) return

    if (state.watching) {
      await window.electron.bulkWatchStop(state.folderPath)
      setState(s => ({ ...s, watching: false }))
    } else {
      const opts: BulkConvertOptions = {
        folderPath: state.folderPath,
        targetFormat: state.targetFormat,
        quality: state.quality,
        outputMode: state.outputMode === 'custom' ? 'alongside' : state.outputMode,
        deleteOriginal: state.deleteOriginal,
        customOutputFolder: state.outputMode === 'custom' ? (defaultOutputFolder ?? undefined) : undefined,
      }
      await window.electron.bulkWatchStart(opts)
      setState(s => ({ ...s, watching: true }))
    }
  }

  const reset = () => {
    if (state.folderPath && state.watching) {
      window.electron.bulkWatchStop(state.folderPath)
    }
    setState(INITIAL)
  }

  const setSetting = async <K extends keyof BulkState>(key: K, value: BulkState[K]) => {
    setState(s => ({ ...s, [key]: value }))

    if (key === 'targetFormat') {
      const folderPath = state.folderPath
      if (!folderPath) return
      const images = await window.electron.bulkScanFolder({ folderPath, targetFormat: value as string })
      const convertible = images.filter((f: { sameFormat: boolean }) => !f.sameFormat)
      const sameFormat = images.filter((f: { sameFormat: boolean }) => f.sameFormat)
      setState(s => ({ ...s, scannedCount: convertible.length, sameFormatCount: sameFormat.length }))
    }
  }

  const retryFile = async (fileId: string) => {
    const file = state.files.find(f => f.id === fileId)
    if (!file || file.ok) return

    // Mark as retrying (remove from list temporarily, then re-add result)
    setState(s => ({ ...s, files: s.files.filter(f => f.id !== fileId) }))

    const opts = {
      srcPath: file.srcPath!,
      targetFormat: state.targetFormat,
      quality: state.quality,
      outputMode: state.outputMode === 'custom' ? 'alongside' : state.outputMode,
      deleteOriginal: state.deleteOriginal,
      customOutputFolder: state.outputMode === 'custom' ? (defaultOutputFolder ?? undefined) : undefined,
    }

    try {
      const result = await window.electron.bulkRetryFile(opts)
      setState(s => ({ ...s, files: [{ ...result, id: uid() }, ...s.files] }))
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setState(s => ({ ...s, files: [{ ...file, id: uid(), error: errMsg }, ...s.files] }))
    }
  }

  return { state, pickFolder, startConvert, toggleWatch, reset, setSetting, retryFile }
}
