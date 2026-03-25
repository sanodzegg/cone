import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Plan = 'trial' | 'monthly' | 'annual' | 'lifetime'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [plan, setPlan] = useState<Plan>('trial')
    const [loading, setLoading] = useState(true)

    async function fetchPlan(userId: string) {
        const { data } = await supabase
            .from('users')
            .select('plan')
            .eq('id', userId)
            .single()
        if (data?.plan) setPlan(data.plan as Plan)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const u = data.session?.user ?? null
            setUser(u)
            if (u) fetchPlan(u.id)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null
            setUser(u)
            if (u) fetchPlan(u.id)
            else setPlan('trial')
        })

        return () => subscription.unsubscribe()
    }, [])

    return { user, plan, loading }
}
