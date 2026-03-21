interface BulkFileResult {
  ok: boolean
  srcPath: string
  destPath?: string
  originalSize?: number
  convertedSize?: number
  savedBytes?: number
  error?: string
}

declare interface Window {
  electron: {
    convert: (buffer: ArrayBuffer, targetFormat: string, quality?: number) => Promise<Uint8Array>
    convertDocument: (buffer: ArrayBuffer, targetFormat: string, sourceFormat: string) => Promise<Uint8Array>
    convertVideo: (buffer: ArrayBuffer, sourceExt: string, targetFormat: string) => Promise<Uint8Array>
    convertFavicon: (buffer: ArrayBuffer) => Promise<{ ico: ArrayBuffer; pngs: { size: number; buf: ArrayBuffer }[] }>

    bulkPickFolder: () => Promise<string | null>
    bulkScanFolder: (opts: { folderPath: string; targetFormat: string }) => Promise<{ path: string; relativePath: string; size: number; sameFormat: boolean }[]>
    bulkConvertFolder: (opts: { folderPath: string; targetFormat: string; quality: number; outputMode: string; deleteOriginal: boolean }) => Promise<BulkFileResult[]>
    bulkWatchStart: (opts: { folderPath: string; targetFormat: string; quality: number; outputMode: string; deleteOriginal: boolean }) => Promise<boolean>
    bulkWatchStop: (folderPath: string) => Promise<boolean>
    onBulkProgress: (cb: (data: { done: number; total: number; latest: BulkFileResult }) => void) => () => void
    onBulkWatchConverted: (cb: (data: BulkFileResult) => void) => () => void
  }
}
