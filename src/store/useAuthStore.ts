import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export type Plan = 'trial' | 'limited' | 'monthly' | 'annual' | 'lifetime'

interface AuthState {
    user: User | null
    plan: Plan
    loading: boolean
    setPlan: (plan: Plan) => void
}

export const useAuthStore = create<AuthState>()(() => ({
    user: null,
    plan: 'trial',
    loading: true,
    setPlan: (plan) => useAuthStore.setState({ plan }),
}))

supabase.auth.getSession().then(async ({ data }) => {
    const u = data.session?.user ?? null
    if (!u) {
        useAuthStore.setState({ user: null, plan: 'trial', loading: false })
        return
    }
    const { data: row } = await supabase.from('users').select('plan').eq('id', u.id).single()
    const plan: Plan = (row?.plan as Plan) ?? 'trial'
    useAuthStore.setState({ user: u, plan, loading: false })
})

// Keep user in sync on sign in / sign out during the session
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        useAuthStore.setState({ user: null, plan: 'trial', loading: false })
    } else if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.setState({ user: session.user })
    }
})
