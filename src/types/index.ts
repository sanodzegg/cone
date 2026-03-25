export type FitMode = 'max' | 'crop' | 'scale'

export interface FileSettings {
  targetFormat: string
  quality?: number
  width?: number
  height?: number
  fit?: FitMode
  keepMetadata?: boolean
}

export interface ConvertedFile {
  name: string
  format: string
  sourceFormat: string
  engineId: string
  inputSize: number
  blob: Blob
  customized: boolean
}

export interface ConversionOptions {
  quality: number
  width?: number
  height?: number
  fit?: FitMode
  keepMetadata?: boolean
}

export interface FileSliceState {
  files: File[]
}

export interface FileSliceActions {
  receiveFiles: (files: File[]) => void
  removeFile: (file: File) => void
}

export interface ConversionSliceState {
  fileSettings: Record<string, FileSettings>
  convertedFiles: Record<string, ConvertedFile>
  failedFiles: Record<string, string>
  convertedCount: number
  convertingTotal: number
  totalInputSize: number
  totalOutputSize: number
  convertingFiles: Set<string>
}

export interface ConversionSliceActions {
  setFileSettings: (file: File, settings: Partial<FileSettings>) => void
  setTargetFormat: (file: File, format: string) => void
  setConvertedFile: (file: File, blob: Blob) => void
  setFailedFile: (file: File, error: string) => void
  startConversion: (files: File[]) => void
  markFileConverting: (file: File) => void
  unmarkFileConverting: (file: File) => void
  resetConversion: () => void
}

export interface SettingsSliceState {
  quality: number
  imageQuality: number
  defaultImageFormat: string
  defaultDocumentFormat: string
  defaultVideoFormat: string
  defaultOutputFolder: string | null
  pendingEditorFile: File | null
}

export interface SettingsSliceActions {
  setQuality: (quality: number) => void
  setImageQuality: (quality: number) => void
  setDefaultImageFormat: (format: string) => void
  setDefaultDocumentFormat: (format: string) => void
  setDefaultVideoFormat: (format: string) => void
  setDefaultOutputFolder: (folder: string | null) => void
  setPendingEditorFile: (file: File | null) => void
}
