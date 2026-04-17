import type { StateCreator } from 'zustand'
import type {
  SettingsSliceState,
  SettingsSliceActions,
  FileSliceState,
  FileSliceActions,
  ConversionSliceState,
  ConversionSliceActions,
} from '@/types'

type FullStore = FileSliceState &
  FileSliceActions &
  ConversionSliceState &
  ConversionSliceActions &
  SettingsSliceState &
  SettingsSliceActions

export const createSettingsSlice: StateCreator<
  FullStore,
  [['zustand/persist', unknown]],
  [],
  SettingsSliceState & SettingsSliceActions
> = (set) => ({
  quality: 60,
  imageQuality: 100,
  defaultImageFormat: 'webp',
  defaultDocumentFormat: 'pdf',
  defaultVideoFormat: 'mp4',
  defaultOutputFolder: null,
  pendingEditorFile: null,
  conversionRatios: {},
  autoDownloadEnabled: false,
  autoDownloadFolder: null,
  setQuality: (quality) => set({ quality }),
  setImageQuality: (imageQuality) => set({ imageQuality }),
  setDefaultImageFormat: (defaultImageFormat) => set({ defaultImageFormat }),
  setDefaultDocumentFormat: (defaultDocumentFormat) => set({ defaultDocumentFormat }),
  setDefaultVideoFormat: (defaultVideoFormat) => set({ defaultVideoFormat }),
  setDefaultOutputFolder: (defaultOutputFolder) => set({ defaultOutputFolder }),
  setPendingEditorFile: (pendingEditorFile) => set({ pendingEditorFile }),
  updateConversionRatio: (key, samples) => set((state) => ({
    conversionRatios: { ...state.conversionRatios, [key]: samples },
  })),
  setAutoDownloadEnabled: (autoDownloadEnabled) => set({ autoDownloadEnabled }),
  setAutoDownloadFolder: (autoDownloadFolder) => set({ autoDownloadFolder }),
})
