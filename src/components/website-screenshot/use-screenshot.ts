import { useState, useEffect } from 'react'

export type BrowserStatus = 'unknown' | 'downloading' | 'ready' | 'error'
export type CaptureStatus = 'idle' | 'capturing' | 'done' | 'error' | 'timeout'

export interface ScreenshotState {
  browserStatus: BrowserStatus
  browserError: string | null
  url: string
  format: 'png' | 'jpg' | 'webp'
  viewportWidth: number
  captureStatus: CaptureStatus
  preview: string | null       // base64 data URL for display
  buffer: number[] | null      // raw bytes for saving
  savedPath: string | null
  error: string | null
}

const INITIAL: ScreenshotState = {
  browserStatus: 'unknown',
  browserError: null,
  url: '',
  format: 'png',
  viewportWidth: 1440,
  captureStatus: 'idle',
  preview: null,
  buffer: null,
  savedPath: null,
  error: null,
}

export function useScreenshot() {
  const [state, setState] = useState<ScreenshotState>(INITIAL)

  useEffect(() => {
    const unsub = window.electron.onScreenshotBrowserStatus(({ status, error }) => {
      setState(s => ({ ...s, browserStatus: status, browserError: error ?? null }))
    })
    window.electron.screenshotEnsureBrowser()
    return unsub
  }, [])

  const capture = async () => {
    if (!state.url) return
    const url = normalizeUrl(state.url)
    setState(s => ({ ...s, url, captureStatus: 'capturing', preview: null, buffer: null, savedPath: null, error: null }))

    try {
      const result = await window.electron.screenshotCapture({
        url: state.url,
        format: state.format,
        viewportWidth: state.viewportWidth,
      })
      setState(s => ({ ...s, captureStatus: 'done', preview: result.preview, buffer: result.buffer }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const isTimeout = message.toLowerCase().includes('timeout')
      setState(s => ({ ...s, captureStatus: isTimeout ? 'timeout' : 'error', error: message }))
    }
  }

  const save = async () => {
    if (!state.buffer) return
    const result = await window.electron.screenshotSave({
      buffer: state.buffer,
      format: state.format,
      url: state.url,
    })
    if (!result.canceled && result.filePath) {
      setState(s => ({ ...s, savedPath: result.filePath ?? null }))
    }
  }

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const setUrl = (url: string) => setState(s => ({ ...s, url, error: null }))
  const blurUrl = () => setState(s => ({ ...s, url: normalizeUrl(s.url) }))
  const setFormat = (format: ScreenshotState['format']) => setState(s => ({ ...s, format }))
  const setViewportWidth = (viewportWidth: number) => setState(s => ({ ...s, viewportWidth }))
  const reset = () => setState(s => ({ ...INITIAL, browserStatus: s.browserStatus }))

  return { state, capture, save, setUrl, blurUrl, setFormat, setViewportWidth, reset }
}
