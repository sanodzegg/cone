import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import { getLocalCounts, TRIAL_LIMITS } from '@/lib/useConversionCount'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup'

const PLAN_LABEL: Record<string, string> = {
    trial: 'Trial',
    monthly: 'Pro — Monthly',
    annual: 'Pro — Annual',
    lifetime: 'Lifetime',
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
    const pct = Math.min((used / limit) * 100, 100)
    const isNear = pct >= 80
    const isFull = pct >= 100
    return (
        <div className="w-full h-1.5 rounded-full bg-accent overflow-hidden">
            <div
                className={cn('h-full rounded-full transition-all', isFull ? 'bg-destructive' : isNear ? 'bg-yellow-500' : 'bg-primary')}
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}

export default function Auth() {
    const { user, plan, loading } = useAuth()
    const navigate = useNavigate()
    const [mode, setMode] = useState<Mode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setMessage(null)
        setSubmitting(true)

        if (mode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) setError(error.message)
            else navigate('/')
        } else {
            const { error } = await supabase.auth.signUp({ email, password })
            if (error) setError(error.message)
            else setMessage('Check your email to confirm your account.')
        }

        setSubmitting(false)
    }

    async function handleSignOut() {
        await supabase.auth.signOut()
    }

    if (loading) return null

    if (user) {
        const counts = getLocalCounts()
        const isTrial = plan === 'trial'

        return (
            <section className="section py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-body font-semibold text-foreground">Account</h2>
                    <p className="text-sm text-muted-foreground mt-1">Manage your account and usage.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Account info */}
                    <div className="rounded-2xl border border-border p-5 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</p>
                        <div>
                            <p className="text-sm font-medium text-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSignOut}>Sign out</Button>
                    </div>

                    {/* Usage — only meaningful for trial */}
                    <div className="rounded-2xl border border-border p-5 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usage</p>
                        {isTrial ? (
                            <div className="space-y-3">
                                {([
                                    { label: 'Images', used: counts.image, limit: TRIAL_LIMITS.image },
                                    { label: 'Documents', used: counts.document, limit: TRIAL_LIMITS.document },
                                    { label: 'Videos', used: counts.video, limit: TRIAL_LIMITS.video },
                                ] as const).map(({ label, used, limit }) => (
                                    <div key={label} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                            <p className="text-xs text-foreground">{used} / {limit}</p>
                                        </div>
                                        <UsageBar used={used} limit={limit} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-sm text-foreground font-medium">Unlimited</p>
                                <p className="text-xs text-muted-foreground">
                                    Images: {counts.image} &middot; Documents: {counts.document} &middot; Videos: {counts.video}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Plan */}
                    <div className="rounded-2xl border border-border p-5 space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</p>
                        <div>
                            <p className="text-sm font-medium text-foreground">{PLAN_LABEL[plan] ?? plan}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isTrial ? 'Limited conversions — upgrade for unlimited access.' : 'Unlimited conversions.'}
                            </p>
                        </div>
                        {isTrial && (
                            <Button size="sm" onClick={() => navigate('/pricing')}>Upgrade</Button>
                        )}
                    </div>
                </div>
            </section>
        )
    }

    return (
        <div className="max-w-sm mx-auto mt-24 px-6">
            <h2 className="font-body text-2xl font-semibold text-primary mb-1">
                {mode === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
                {mode === 'login' ? 'Welcome back.' : 'Start using Cone with an account.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {message && <p className="text-sm text-primary">{message}</p>}

                <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </Button>
            </form>

            <p className="text-sm text-muted-foreground mt-4 text-center">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                    className="text-primary underline underline-offset-2"
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setMessage(null) }}
                >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
            </p>
        </div>
    )
}
