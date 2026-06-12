import type { StateCreator } from 'zustand'
import type {
  ConversionSliceState,
  ConversionSliceActions,
  FileSliceState,
  SettingsSliceState,
  SettingsSliceActions,
} from '@/types'
import { fileKey, getExtension } from '@/utils/fileUtils'
import { getEngineForFile } from '@/engines/engineRegistry'
import { ratioKey, computeUpdatedSamples } from '@/utils/estimateSize'

type FullStore = FileSliceState & ConversionSliceState & ConversionSliceActions & SettingsSliceState & SettingsSliceActions

export const createConversionSlice: StateCreator<
  FullStore,
  [],
  [],
  ConversionSliceState & ConversionSliceActions
> = (set, get) => ({
  fileSettings: {},
  convertedFiles: {},
  failedFiles: {},
  convertedCount: 0,
  convertingTotal: 0,
  totalInputSize: 0,
  totalOutputSize: 0,
  convertingFiles: new Set<string>(),

  setFileSettings: (file, settings) =>
    set((state) => ({
      fileSettings: {
        ...state.fileSettings,
        [fileKey(file)]: { ...state.fileSettings[fileKey(file)], ...settings },
      },
    })),

  setTargetFormat: (file, format) =>
    set((state) => ({
      fileSettings: {
        ...state.fileSettings,
        [fileKey(file)]: { ...state.fileSettings[fileKey(file)], targetFormat: format },
      },
    })),

  setConvertedFile: (file, blob) => {
    const settings = get().fileSettings[fileKey(file)]
    const format = settings?.targetFormat ?? getExtension(file)
    const sourceFormat = getExtension(file)
    const engineId = getEngineForFile(file)?.id ?? 'unknown'
    const name = file.name.replace(/\.[^.]+$/, `.${format}`)
    const customized = !!(
      settings?.width ||
      settings?.height ||
      settings?.quality !== undefined ||
      settings?.keepMetadata === false
    )

    // Record actual ratio for future estimates (skip SVG source - file size has no correlation to raster output)
    const shouldLearn = sourceFormat && format && sourceFormat !== 'svg'
    const learnKey = shouldLearn ? ratioKey(sourceFormat, format) : null
    const learnQuality = engineId === 'image' ? (settings?.quality ?? get().imageQuality) : 80

    set((state) => {
      let ratiosPatch: Partial<FullStore> = {}
      if (learnKey) {
        const existing = (state as unknown as FullStore).conversionRatios?.[learnKey] ?? []
        const updated = computeUpdatedSamples(existing, file.size, blob.size, learnQuality)
        ratiosPatch = { conversionRatios: { ...(state as unknown as FullStore).conversionRatios, [learnKey]: updated } }
      }
      return {
        ...ratiosPatch,
        convertedFiles: {
          ...state.convertedFiles,
          [fileKey(file)]: { name, format, sourceFormat, engineId, inputSize: file.size, blob, customized },
        },
        convertedCount: state.convertedCount + 1,
        totalOutputSize: state.totalOutputSize + blob.size,
      }
    })
  },

  setFailedFile: (file, error) =>
    set((state) => ({
      failedFiles: { ...state.failedFiles, [fileKey(file)]: error },
    })),

  startConversion: (files) =>
    set({
      convertedCount: 0,
      convertingTotal: files.length,
      convertedFiles: {},
      failedFiles: {},
      totalInputSize: files.reduce((acc, f) => acc + f.size, 0),
      totalOutputSize: 0,
      convertingFiles: new Set<string>(),
    }),

  markFileConverting: (file) =>
    set((state) => ({ convertingFiles: new Set([...state.convertingFiles, fileKey(file)]) })),

  unmarkFileConverting: (file) =>
    set((state) => {
      const next = new Set(state.convertingFiles)
      next.delete(fileKey(file))
      return { convertingFiles: next }
    }),

  resetConversion: () =>
    set({
      files: [],
      fileSettings: {},
      convertedFiles: {},
      failedFiles: {},
      convertedCount: 0,
      convertingTotal: 0,
      totalInputSize: 0,
      totalOutputSize: 0,
      convertingFiles: new Set<string>(),
    }),

  markAutoSaved: (key) =>
    set((state) => {
      const entry = state.convertedFiles[key]
      if (!entry) return {}
      return {
        convertedFiles: {
          ...state.convertedFiles,
          [key]: { ...entry, autoSaved: true },
        },
      }
    }),
})
