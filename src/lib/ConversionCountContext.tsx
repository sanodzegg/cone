import { createContext, useContext } from 'react'
import type { EngineType } from './useConversionCount'

interface ConversionCountContextValue {
    onConversionSuccess: (engineId: string) => void
    onBatchComplete: (successCount: number, totalCount: number) => void
}

export const ConversionCountContext = createContext<ConversionCountContextValue>({
    onConversionSuccess: () => {},
    onBatchComplete: () => {},
})

export function useConversionCountContext() {
    return useContext(ConversionCountContext)
}

export function toEngineType(engineId: string): EngineType | null {
    if (engineId === 'image') return 'image'
    if (engineId === 'document') return 'document'
    if (engineId === 'video') return 'video'
    if (engineId === 'audio') return 'audio'
    return null
}
