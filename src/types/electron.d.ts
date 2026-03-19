declare interface Window {
  electron: {
    convert: (buffer: ArrayBuffer, targetFormat: string, quality?: number) => Promise<Uint8Array>
    convertDocument: (buffer: ArrayBuffer, targetFormat: string, sourceFormat: string) => Promise<Uint8Array>
    convertVideo: (buffer: ArrayBuffer, sourceExt: string, targetFormat: string) => Promise<Uint8Array>
  }
}
