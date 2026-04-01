import { useEffect, useRef } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type EngineType = 'image' | 'document' | 'video' | 'audio'

export interface ConversionCounts {
    image: number
    document: number
    video: number
    audio: number
}

const STORAGE_KEY = 'cone_conversion_counts'
const DAILY_STORAGE_KEY = 'cone_daily_counts'

const LIMITS: ConversionCounts = {
    image: 100,
    document: 50,
    video: 20,
    audio: 10,
}

const DAILY_LIMITS: ConversionCounts = {
    image: 20,
    document: 20,
    video: 10,
    audio: 10,
}

export const TRIAL_LIMITS = LIMITS
export const LIMITED_DAILY_LIMITS = DAILY_LIMITS

interface DailyCounts {
    image: number
    document: number
    video: number
    audio: number
    resetAt: number // epoch ms when the window expires
}

function getDailyLocal(): DailyCounts {
    try {
        const raw = localStorage.getItem(DAILY_STORAGE_KEY)
        if (!raw) return { image: 0, document: 0, video: 0, audio: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 }
        const parsed = JSON.parse(raw) as DailyCounts
        if (Date.now() > parsed.resetAt) {
            const fresh: DailyCounts = { image: 0, document: 0, video: 0, audio: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 }
            localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(fresh))
            return fresh
        }
        return parsed
    } catch {
        return { image: 0, document: 0, video: 0, audio: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 }
    }
}

function setDailyLocal(counts: DailyCounts) {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(counts))
}

export function incrementDailyCount(engine: EngineType) {
    const counts = getDailyLocal()
    if (counts[engine] >= DAILY_LIMITS[engine]) return
    counts[engine] = (counts[engine] ?? 0) + 1
    setDailyLocal(counts)
}

export function getDailyCounts(): DailyCounts {
    return getDailyLocal()
}

export function isTrialExhausted(): boolean {
    const counts = getLocal()
    return counts.image >= LIMITS.image || counts.document >= LIMITS.document || counts.video >= LIMITS.video || counts.audio >= LIMITS.audio
}

function getLocal(): ConversionCounts {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { image: 0, document: 0, video: 0, audio: 0 }
        const parsed = JSON.parse(raw)
        return {
            image: parsed.image ?? 0,
            document: parsed.document ?? 0,
            video: parsed.video ?? 0,
            audio: parsed.audio ?? 0,
        }
    } catch {
        return { image: 0, document: 0, video: 0, audio: 0 }
    }
}

function setLocal(counts: ConversionCounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
}

export function incrementLocalCount(engine: EngineType) {
    const counts = getLocal()
    if (counts[engine] >= LIMITS[engine]) {
        // Past trial limit — only track daily window, don't keep inflating the total
        incrementDailyCount(engine)
        return
    }
    counts[engine] = (counts[engine] ?? 0) + 1
    setLocal(counts)
}

export function getLocalCounts(): ConversionCounts {
    return getLocal()
}

export function isAtLimit(engine: EngineType, plan: string): boolean {
    if (plan === 'limited') {
        const daily = getDailyLocal()
        return daily[engine] >= DAILY_LIMITS[engine]
    }
    if (plan !== 'trial') return false
    const counts = getLocal()
    if (counts[engine] < LIMITS[engine]) return false
    // Trial limit hit — fall through to daily window
    const daily = getDailyLocal()
    return daily[engine] >= DAILY_LIMITS[engine]
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
                    audio: Math.max(local.audio, data.audio_count ?? 0),
                }
                setLocal(merged)

                // Push merged back to server if local was higher
                if (
                    merged.image !== data.image_count ||
                    merged.document !== data.document_count ||
                    merged.video !== data.video_count ||
                    merged.audio !== (data.audio_count ?? 0)
                ) {
                    supabase.from('conversion_counts').upsert({
                        user_id: user.id,
                        image_count: merged.image,
                        document_count: merged.document,
                        video_count: merged.video,
                        audio_count: merged.audio,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' })
                }

                synced.current = true
            })
    }, [user, plan])

    // When online, sync local increments to server
    function syncCountToServer() {
        if (!user || !navigator.onLine) return
        const counts = getLocal()
        supabase.from('conversion_counts').upsert({
            user_id: user.id,
            image_count: counts.image,
            document_count: counts.document,
            video_count: counts.video,
            audio_count: counts.audio,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(({ error }) => {
            if (error) console.error('[conversionCount] sync error:', error)
        })
    }

    return { syncCountToServer }
}
