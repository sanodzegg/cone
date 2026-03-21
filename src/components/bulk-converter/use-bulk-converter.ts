import { useState, useEffect, useRef } from 'react'
import type { BulkFileResult, BulkConvertOptions } from '../../../vite-env'

export type OutputMode = 'alongside' | 'subfolder'

export interface ConvertedFile extends BulkFileResult {
  id: string
}

export interface BulkState {
  folderPath: string | null
  scannedCount: number
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

export function useBulkConverter() {
  const [state, setState] = useState<BulkState>(INITIAL)
  const watchCleanupRef = useRef<(() => void) | null>(null)

  // Subscribe to watch events
  useEffect(() => {
    const unsub = window.electron.onBulkWatchConverted((data) => {
      setState(s => ({
        ...s,
        files: [{ ...data, id: uid() }, ...s.files],
      }))
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
    setState(s => ({ ...s, scannedCount: convertible.length, status: 'idle' }))
  }

  const startConvert = async () => {
    if (!state.folderPath) return

    setState(s => ({ ...s, status: 'converting', files: [], progress: { done: 0, total: 0 } }))

    const opts: BulkConvertOptions = {
      folderPath: state.folderPath,
      targetFormat: state.targetFormat,
      quality: state.quality,
      outputMode: state.outputMode,
      deleteOriginal: state.deleteOriginal,
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
        outputMode: state.outputMode,
        deleteOriginal: state.deleteOriginal,
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

  const setSetting = <K extends keyof BulkState>(key: K, value: BulkState[K]) => {
    setState(s => ({ ...s, [key]: value }))
  }

  return { state, pickFolder, startConvert, toggleWatch, reset, setSetting }
}
