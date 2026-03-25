import { createContext, useContext } from 'react'
import type { EngineType } from './useConversionCount'

interface ConversionCountContextValue {
    onConversionSuccess: (engineId: string) => void
}

export const ConversionCountContext = createContext<ConversionCountContextValue>({
    onConversionSuccess: () => {},
})

export function useConversionCountContext() {
    return useContext(ConversionCountContext)
}

export function toEngineType(engineId: string): EngineType | null {
    if (engineId === 'image') return 'image'
    if (engineId === 'document') return 'document'
    if (engineId === 'video' || engineId === 'audio') return 'video'
    return null
}
