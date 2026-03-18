import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`

const allFormats = ['webp', 'png', 'jpg', 'avif', 'gif', 'tiff']
const defaultFormat = (f: File) => {
  const ext = f.type.replace('image/', '')
  return allFormats.filter(fmt => fmt !== ext)[0]
}

interface ConvertedFile {
  name: string
  format: string
  blob: Blob
}

export default interface AppState {
  files: File[]
  targetFormats: Record<string, string>
  convertedFiles: Record<string, ConvertedFile>
  failedFiles: Record<string, string>
  convertedCount: number
  convertingTotal: number
  quality: number
  defaultOutputFormat: string
  totalInputSize: number
  totalOutputSize: number
  currentFileName: string
}

interface AppActions {
  receiveFiles: (files: File[]) => void
  setTargetFormat: (file: File, format: string) => void
  setConvertedFile: (file: File, blob: Blob) => void
  setFailedFile: (file: File, error: string) => void
  startConversion: (files: File[]) => void
  setQuality: (quality: number) => void
  setDefaultOutputFormat: (format: string) => void
  setCurrentFileName: (name: string) => void
  removeFile: (file: File) => void
  reset: () => void
}

export const useAppStore = create<AppState & AppActions>()(persist((set, get) => ({
  files: [],
  targetFormats: {},
  convertedFiles: {},
  failedFiles: {},
  convertedCount: 0,
  convertingTotal: 0,
  quality: 60,
  defaultOutputFormat: 'webp',
  totalInputSize: 0,
  totalOutputSize: 0,
  currentFileName: '',
  receiveFiles: (files) => set((state) => {
    const key = (f: File) => `${f.name}-${f.size}-${f.lastModified}`
    const existing = new Set(state.files.map(key))
    const newFiles = files.filter(f => {
      const k = key(f)
      if (existing.has(k)) return false
      existing.add(k)
      return true
    })
    const newFormats: Record<string, string> = {}
    newFiles.forEach(f => {
      const ext = f.type.replace('image/', '')
      const preferred = state.defaultOutputFormat
      newFormats[fileKey(f)] = preferred !== ext ? preferred : defaultFormat(f)
    })
    return {
      files: [...state.files, ...newFiles],
      targetFormats: { ...state.targetFormats, ...newFormats },
    }
  }),
  setTargetFormat: (file, format) => set((state) => ({
    targetFormats: { ...state.targetFormats, [fileKey(file)]: format },
  })),
  setFailedFile: (file, error) => set((state) => ({
    failedFiles: { ...state.failedFiles, [fileKey(file)]: error },
    convertedCount: state.convertedCount + 1,
  })),
  startConversion: (files) => set({
    convertedCount: 0,
    convertingTotal: files.length,
    failedFiles: {},
    totalInputSize: files.reduce((acc, f) => acc + f.size, 0),
    totalOutputSize: 0,
    currentFileName: '',
  }),
  setConvertedFile: (file, blob) => {
    const format = get().targetFormats[fileKey(file)]
    const name = file.name.replace(/\.[^.]+$/, `.${format}`)
    set((state) => ({
      convertedFiles: { ...state.convertedFiles, [fileKey(file)]: { name, format, blob } },
      convertedCount: state.convertedCount + 1,
      totalOutputSize: state.totalOutputSize + blob.size,
    }))
  },
  setCurrentFileName: (name) => set({ currentFileName: name }),
  setQuality: (quality) => set({ quality }),
  setDefaultOutputFormat: (defaultOutputFormat) => set({ defaultOutputFormat }),
  removeFile: (file) => set((state) => {
    const k = fileKey(file)
    const { [k]: _tf, ...targetFormats } = state.targetFormats
    const { [k]: _ff, ...failedFiles } = state.failedFiles
    return { files: state.files.filter(f => fileKey(f) !== k), targetFormats, failedFiles }
  }),
  reset: () => set((state) => ({
    files: [],
    targetFormats: {},
    convertedFiles: {},
    failedFiles: {},
    convertedCount: 0,
    convertingTotal: 0,
    totalInputSize: 0,
    totalOutputSize: 0,
    currentFileName: '',
    quality: state.quality,
  })),
}), {
  name: 'app-store',
  partialize: (state) => ({ quality: state.quality, defaultOutputFormat: state.defaultOutputFormat }),
}))

export { fileKey, allFormats }
export type { ConvertedFile }
