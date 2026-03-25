import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type EngineType = 'image' | 'document' | 'video'

export interface ConversionCounts {
    image: number
    document: number
    video: number
}

const STORAGE_KEY = 'cone_conversion_counts'

const LIMITS: ConversionCounts = {
    image: 500,
    document: 500,
    video: 100,
}

export const TRIAL_LIMITS = LIMITS

function getLocal(): ConversionCounts {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { image: 0, document: 0, video: 0 }
        const parsed = JSON.parse(raw)
        return {
            image: parsed.image ?? 0,
            document: parsed.document ?? 0,
            video: parsed.video ?? 0,
        }
    } catch {
        return { image: 0, document: 0, video: 0 }
    }
}

function setLocal(counts: ConversionCounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
}

export function incrementLocalCount(engine: EngineType) {
    const counts = getLocal()
    counts[engine] = (counts[engine] ?? 0) + 1
    setLocal(counts)
}

export function getLocalCounts(): ConversionCounts {
    return getLocal()
}

export function isAtLimit(engine: EngineType, plan: string): boolean {
    if (plan !== 'trial') return false
    const counts = getLocal()
    return counts[engine] >= LIMITS[engine]
}

export function useConversionCount(user: User | null, plan: string) {
    const synced = useRef(false)

    useEffect(() => {
        if (!user || !navigator.onLine || synced.current) return

        // Fetch server counts and take the higher of server vs local
        supabase
            .from('conversion_counts')
            .select('*')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
                if (!data) return
                const local = getLocal()
                const merged: ConversionCounts = {
                    image: Math.max(local.image, data.image_count),
                    document: Math.max(local.document, data.document_count),
                    video: Math.max(local.video, data.video_count),
                }
                setLocal(merged)

                // Push merged back to server if local was higher
                if (
                    merged.image !== data.image_count ||
                    merged.document !== data.document_count ||
                    merged.video !== data.video_count
                ) {
                    supabase.from('conversion_counts').upsert({
                        user_id: user.id,
                        image_count: merged.image,
                        document_count: merged.document,
                        video_count: merged.video,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' })
                }

                synced.current = true
            })
    }, [user, plan])

    // When online, sync local increments to server
    function syncCountToServer(engine: EngineType) {
        if (!user || !navigator.onLine) return
        const counts = getLocal()
        supabase.from('conversion_counts').upsert({
            user_id: user.id,
            image_count: counts.image,
            document_count: counts.document,
            video_count: counts.video,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(({ error }) => {
            if (error) console.error('[conversionCount] sync error:', error)
        })
    }

    return { syncCountToServer }
}
