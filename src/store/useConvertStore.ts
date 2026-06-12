import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createFileSlice } from './slices/fileSlice'
import { createConversionSlice } from './slices/conversionSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import type {
  FileSliceState,
  FileSliceActions,
  ConversionSliceState,
  ConversionSliceActions,
  SettingsSliceState,
  SettingsSliceActions,
} from '@/types'

export type ConvertStore = FileSliceState &
  FileSliceActions &
  ConversionSliceState &
  ConversionSliceActions &
  SettingsSliceState &
  SettingsSliceActions

export const useConvertStore = create<ConvertStore>()(
  persist(
    (...a) => ({
      ...createFileSlice(...a),
      ...createConversionSlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: 'convert-store',
      partialize: (state) => ({
        quality: state.quality,
        imageQuality: state.imageQuality,
        defaultImageFormat: state.defaultImageFormat,
        defaultDocumentFormat: state.defaultDocumentFormat,
        defaultVideoFormat: state.defaultVideoFormat,
        defaultOutputFolder: state.defaultOutputFolder,
        conversionRatios: state.conversionRatios,
        autoDownloadEnabled: state.autoDownloadEnabled,
        autoDownloadFolder: state.autoDownloadFolder,
        // pendingEditorFile intentionally excluded - File objects can't be serialized
      }),
    }
  )
)
