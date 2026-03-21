/// <reference types="vite/client" />

export interface BulkFileResult {
  ok: boolean
  srcPath: string
  destPath?: string
  originalSize?: number
  convertedSize?: number
  savedBytes?: number
  error?: string
}

export interface BulkProgressEvent {
  done: number
  total: number
  latest: BulkFileResult
}

export interface BulkConvertOptions {
  folderPath: string
  targetFormat: string
  quality: number
  outputMode: 'alongside' | 'subfolder'
  deleteOriginal: boolean
}

interface Window {
  electron: {
    convert: (buffer: ArrayBuffer, targetFormat: string, quality?: number) => Promise<Uint8Array>
    convertDocument: (buffer: ArrayBuffer, targetFormat: string, sourceFormat: string) => Promise<Uint8Array>
    convertVideo: (buffer: ArrayBuffer, sourceExt: string, targetFormat: string, videoOptions?: unknown) => Promise<Uint8Array>
    convertFavicon: (buffer: ArrayBuffer) => Promise<unknown>

    bulkPickFolder: () => Promise<string | null>
    bulkScanFolder: (opts: { folderPath: string; targetFormat: string }) => Promise<{ path: string; relativePath: string; size: number; sameFormat: boolean }[]>
    bulkConvertFolder: (opts: BulkConvertOptions) => Promise<BulkFileResult[]>
    bulkWatchStart: (opts: BulkConvertOptions) => Promise<boolean>
    bulkWatchStop: (folderPath: string) => Promise<boolean>
    onBulkProgress: (cb: (data: BulkProgressEvent) => void) => () => void
    onBulkWatchConverted: (cb: (data: BulkFileResult) => void) => () => void
  }
}

declare module '*.svg' {
  const src: string
  export default src
}
