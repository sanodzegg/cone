import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useConvertStore } from '@/store/useConvertStore'
import type { User } from '@supabase/supabase-js'

export interface RemoteSettings {
    image_quality: number
    default_image_format: string
    default_document_format: string
    default_video_format: string
    default_output_folder: string | null
}

function extractSettings(state: ReturnType<typeof useConvertStore.getState>): RemoteSettings {
    return {
        image_quality: state.imageQuality,
        default_image_format: state.defaultImageFormat,
        default_document_format: state.defaultDocumentFormat,
        default_video_format: state.defaultVideoFormat,
        default_output_folder: state.defaultOutputFolder,
    }
}

export function useSettingsSync(user: User | null) {
    const didLoadRemote = useRef(false)
    const [conflictSettings, setConflictSettings] = useState<RemoteSettings | null>(null)
    const [localAtConflict, setLocalAtConflict] = useState<RemoteSettings | null>(null)

    // On sign in: fetch remote settings, detect conflict or apply silently
    useEffect(() => {
        if (!user) {
            didLoadRemote.current = false
            return
        }
        if (didLoadRemote.current) return

        const local = extractSettings(useConvertStore.getState())

        supabase
            .from('settings')
            .select('*')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    const remote: RemoteSettings = {
                        image_quality: data.image_quality,
                        default_image_format: data.default_image_format,
                        default_document_format: data.default_document_format,
                        default_video_format: data.default_video_format,
                        default_output_folder: data.default_output_folder ?? null,
                    }
                    const differs =
                        remote.image_quality !== local.image_quality ||
                        remote.default_image_format !== local.default_image_format ||
                        remote.default_document_format !== local.default_document_format ||
                        remote.default_video_format !== local.default_video_format ||
                        remote.default_output_folder !== local.default_output_folder

                    if (differs) {
                        setLocalAtConflict(local)
                        setConflictSettings(remote)
                    } else {
                        applyToStore(remote)
                    }
                } else {
                    // No remote row yet — push local up
                    saveToSupabase(user.id, local)
                }
                didLoadRemote.current = true
            })
    }, [user])

    // Subscribe to store changes and sync to Supabase
    useEffect(() => {
        if (!user) return

        const unsub = useConvertStore.subscribe((state, prev) => {
            if (!didLoadRemote.current) return
            if (
                state.imageQuality === prev.imageQuality &&
                state.defaultImageFormat === prev.defaultImageFormat &&
                state.defaultDocumentFormat === prev.defaultDocumentFormat &&
                state.defaultVideoFormat === prev.defaultVideoFormat &&
                state.defaultOutputFolder === prev.defaultOutputFolder
            ) return

            saveToSupabase(user.id, extractSettings(state))
        })

        return () => unsub()
    }, [user])

    function applyToStore(remote: RemoteSettings) {
        const store = useConvertStore.getState()
        store.setImageQuality(remote.image_quality)
        store.setDefaultImageFormat(remote.default_image_format)
        store.setDefaultDocumentFormat(remote.default_document_format)
        store.setDefaultVideoFormat(remote.default_video_format)
        store.setDefaultOutputFolder(remote.default_output_folder)
    }

    function applyRemote(remote: RemoteSettings) {
        applyToStore(remote)
        setConflictSettings(null)
        setLocalAtConflict(null)
    }

    function keepLocal() {
        if (!user) return
        saveToSupabase(user.id, extractSettings(useConvertStore.getState()))
        setConflictSettings(null)
        setLocalAtConflict(null)
    }

    return { conflictSettings, localAtConflict, applyRemote, keepLocal }
}

function saveToSupabase(userId: string, settings: RemoteSettings) {
    supabase.from('settings').upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error('[settingsSync] save error:', error)
    })
}
