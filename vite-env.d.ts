/// <reference types="vite/client" />

interface Window {
  electron: {
    convert: (buffer: ArrayBuffer, targetFormat: string, quality?: number) => Promise<Uint8Array>
  }
}

declare module '*.svg' {
  const src: string
  export default src
}
