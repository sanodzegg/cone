interface BulkConvertOptions {
  folderPath: string
  targetFormat: string
  quality: number
  outputMode: 'alongside' | 'subfolder'
  deleteOriginal: boolean
  customOutputFolder?: string
}

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
    convert: (buffer: ArrayBuffer, targetFormat: string, quality?: number, imageOptions?: { width?: number; height?: number; fit?: string; keepMetadata?: boolean }) => Promise<Uint8Array>
    convertDocument: (buffer: ArrayBuffer, targetFormat: string, sourceFormat: string) => Promise<Uint8Array>
    convertVideo: (buffer: ArrayBuffer, sourceExt: string, targetFormat: string) => Promise<Uint8Array>
    convertAudio: (buffer: ArrayBuffer, sourceExt: string, targetFormat: string) => Promise<Uint8Array>
    convertFavicon: (buffer: ArrayBuffer) => Promise<{ ico: ArrayBuffer; pngs: { size: number; buf: ArrayBuffer }[] }>

    bulkPickFolder: () => Promise<string | null>
    bulkScanFolder: (opts: { folderPath: string; targetFormat: string }) => Promise<{ path: string; relativePath: string; size: number; sameFormat: boolean }[]>
    bulkConvertFolder: (opts: { folderPath: string; targetFormat: string; quality: number; outputMode: string; deleteOriginal: boolean; customOutputFolder?: string }) => Promise<BulkFileResult[]>
    bulkWatchStart: (opts: { folderPath: string; targetFormat: string; quality: number; outputMode: string; deleteOriginal: boolean; customOutputFolder?: string }) => Promise<boolean>
    bulkWatchStop: (folderPath: string) => Promise<boolean>
    bulkRetryFile: (opts: { srcPath: string; targetFormat: string; quality: number; outputMode: string; deleteOriginal: boolean; customOutputFolder?: string }) => Promise<BulkFileResult>
    onBulkProgress: (cb: (data: { done: number; total: number; latest: BulkFileResult }) => void) => () => void
    onBulkWatchConverted: (cb: (data: BulkFileResult) => void) => () => void

    // PDF tools
    pdfMerge: (opts: { filePaths: string[] }) => Promise<{}>
    pdfMergeSave: () => Promise<{ canceled: boolean; filePath?: string }>
    pdfPickFiles: () => Promise<{ canceled: boolean; files: { path: string; name: string; size: number }[] }>

    // Website PDF
    websitePdfGenerate: (opts: {
      url: string
      viewportWidth: number
      format: string
      orientation: 'portrait' | 'landscape'
      marginTop: number
      marginBottom: number
      marginLeft: number
      marginRight: number
      printBackground: boolean
      waitUntil: 'load' | 'domcontentloaded' | 'networkidle'
      waitTime: number
    }) => Promise<{ ok: boolean }>
    websitePdfSave: () => Promise<{ canceled: boolean; filePath?: string }>
    onWebsitePdfWaiting: (cb: (data: { waitTime: number }) => void) => () => void

    // Website screenshot
    screenshotEnsureBrowser: () => Promise<boolean>
    screenshotCapture: (opts: { url: string; format: 'png' | 'jpg' | 'webp'; viewportWidth: number; userAgent?: string }) => Promise<{ preview: string; buffer: number[]; format: string }>
    screenshotSave: (opts: { buffer: number[]; format: string; url: string }) => Promise<{ canceled: boolean; filePath?: string }>
    onScreenshotBrowserStatus: (cb: (data: { status: 'downloading' | 'ready' | 'error'; error?: string }) => void) => () => void

    // Tray / notifications
    showNotification: (title: string, body: string) => void
  }
}
