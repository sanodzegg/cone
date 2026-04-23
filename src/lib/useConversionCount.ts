import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { supabase } from './supabase'
import { useAuthStore } from '@/store/useAuthStore'
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

// "Exhausted" means every category has hit its trial cap — at that point the user
// is fully on daily buckets, which is what the 'limited' plan represents.
// Partial caps keep the user on 'trial' so unexhausted categories still show
// trial progress and tier-gated features stay available.
export function isTrialExhausted(): boolean {
    const counts = getLocal()
    return counts.image >= LIMITS.image && counts.document >= LIMITS.document && counts.video >= LIMITS.video && counts.audio >= LIMITS.audio
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
    useCountsStore.setState({ counts })
}

// Reactive store so UI re-renders when counts change (sign-in merge, increments, Realtime overwrites)
export const useCountsStore = create<{ counts: ConversionCounts }>()(() => ({
    counts: getLocal(),
}))

// Returns a refund fn that reverses exactly what this increment did. Counts are
// reserved at the start of a conversion so parallel attempts can't all pass the
// same limit check; call the returned refund fn if the conversion ends up failing
// so the user doesn't lose a slot.
export function incrementLocalCount(engine: EngineType, plan: string): () => void {
    const counts = getLocal()
    const isPaid = plan === 'monthly' || plan === 'annual' || plan === 'lifetime'
    // Free plans past trial cap: stop inflating the total and track the daily window instead.
    // Paid plans: always increment — the total is just a lifetime counter, no gating logic.
    if (!isPaid && counts[engine] >= LIMITS[engine]) {
        const daily = getDailyLocal()
        if (daily[engine] >= DAILY_LIMITS[engine]) return () => {}
        daily[engine] = (daily[engine] ?? 0) + 1
        setDailyLocal(daily)
        return () => {
            const d = getDailyLocal()
            if (d[engine] > 0) {
                d[engine] = d[engine] - 1
                setDailyLocal(d)
            }
        }
    }
    counts[engine] = (counts[engine] ?? 0) + 1
    setLocal(counts)
    return () => {
        const c = getLocal()
        if (c[engine] > 0) {
            c[engine] = c[engine] - 1
            setLocal(c)
        }
    }
}

export function getLocalCounts(): ConversionCounts {
    return getLocal()
}

export function isAtLimit(engine: EngineType, plan: string): boolean {
    if (plan !== 'trial' && plan !== 'limited') return false
    // Per-category: if trial budget remains, gate on trial total; otherwise on daily window.
    // This way hitting the trial cap on one category doesn't retroactively put every other
    // category on a daily leash.
    const counts = getLocal()
    if (counts[engine] < LIMITS[engine]) return false
    const daily = getDailyLocal()
    return daily[engine] >= DAILY_LIMITS[engine]
}

// Track snapshots we ourselves pushed to Supabase so Realtime echoes of our own
// writes can be distinguished from authoritative manual DB edits. Necessary because
// paid-plan conversions each trigger an upsert, and out-of-order echoes would
// otherwise roll back in-flight increments.
// Bounded FIFO so stray un-echoed snapshots (network drops) can't leak forever and
// can't poison future manual-edit detection by coincidence.
const PUSHED_CAP = 64
const pushedSnapshots: string[] = []
const snapshotKey = (c: ConversionCounts) => `${c.image}|${c.document}|${c.video}|${c.audio}`
function rememberPush(key: string) {
    pushedSnapshots.push(key)
    if (pushedSnapshots.length > PUSHED_CAP) pushedSnapshots.shift()
}
function consumePush(key: string): boolean {
    const idx = pushedSnapshots.indexOf(key)
    if (idx === -1) return false
    pushedSnapshots.splice(idx, 1)
    return true
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
            .then(({ data, error }) => {
                // PGRST116 = no row yet (trigger slow / missing); treat as all-zeros so
                // local counts still get pushed up. Any other error is a real failure.
                if (error && error.code !== 'PGRST116') {
                    console.error('[conversionCount] fetch error:', error)
                    return
                }
                const local = getLocal()
                const server = {
                    image: data?.image_count ?? 0,
                    document: data?.document_count ?? 0,
                    video: data?.video_count ?? 0,
                    audio: data?.audio_count ?? 0,
                }
                const merged: ConversionCounts = {
                    image: Math.max(local.image, server.image),
                    document: Math.max(local.document, server.document),
                    video: Math.max(local.video, server.video),
                    audio: Math.max(local.audio, server.audio),
                }
                setLocal(merged)

                // Push merged back to server if local was higher or row didn't exist yet
                const needsPush = !data
                    || merged.image !== server.image
                    || merged.document !== server.document
                    || merged.video !== server.video
                    || merged.audio !== server.audio
                if (needsPush) {
                    rememberPush(snapshotKey(merged))
                    supabase.from('conversion_counts').upsert({
                        user_id: user.id,
                        image_count: merged.image,
                        document_count: merged.document,
                        video_count: merged.video,
                        audio_count: merged.audio,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' }).then(({ error: upsertError }) => {
                        if (upsertError) console.error('[conversionCount] sign-in upsert error:', upsertError)
                    })
                }

                synced.current = true
            })
    }, [user, plan])

    // Listen for manual DB edits to conversion_counts via Realtime.
    // Supabase is authoritative here — we overwrite local outright (no Math.max merge).
    useEffect(() => {
        if (!user) return
        const channel = supabase
            .channel(`counts-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'conversion_counts' },
                (payload) => {
                    if (payload.new.user_id !== user.id) return
                    const remote: ConversionCounts = {
                        image: payload.new.image_count ?? 0,
                        document: payload.new.document_count ?? 0,
                        video: payload.new.video_count ?? 0,
                        audio: payload.new.audio_count ?? 0,
                    }
                    // Echo guard: if this matches a value we ourselves pushed, it's our own
                    // round-trip — ignore. Under concurrent conversions, later echoes may
                    // arrive after local has already moved on; a naive remote===local check
                    // would misread them as manual edits and roll state back.
                    if (consumePush(snapshotKey(remote))) return

                    // Second-line guard: burst upserts can collapse into fewer echoes on the
                    // server side, so we may see an echo whose snapshot was already consumed
                    // by an earlier identical echo. If remote still matches current local,
                    // there's nothing authoritative to apply — skip to avoid redundant writes.
                    const local = getLocal()
                    if (remote.image === local.image && remote.document === local.document
                        && remote.video === local.video && remote.audio === local.audio) return

                    setLocal(remote)

                    // If all categories are back within trial limits, clear daily window
                    // and auto-revert limited → trial (support resetting a user's plan by
                    // just lowering their counts in Supabase)
                    const allUnderTrial = remote.image < LIMITS.image && remote.document < LIMITS.document
                        && remote.video < LIMITS.video && remote.audio < LIMITS.audio
                    if (allUnderTrial) {
                        localStorage.removeItem(DAILY_STORAGE_KEY)
                        const { plan: currentPlan, setPlan } = useAuthStore.getState()
                        if (currentPlan === 'limited') {
                            setPlan('trial')
                            supabase.from('users').update({ plan: 'trial' }).eq('id', user.id)
                                .then(({ error }) => {
                                    if (error) console.error('[conversionCount] failed to revert plan:', error)
                                })
                        }
                    }
                }
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user])

    // When online, sync local increments to server
    function syncCountToServer() {
        if (!user || !navigator.onLine) return
        const counts = getLocal()
        rememberPush(snapshotKey(counts))
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
