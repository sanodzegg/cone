import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { Plan } from '@/lib/useAuth'
import { Button } from '@/components/ui/button'

export const PLAN_LABEL: Record<string, string> = {
    trial: 'Trial',
    limited: 'Limited',
    monthly: 'Pro — Monthly',
    annual: 'Pro — Annual',
    lifetime: 'Lifetime',
}

interface AccountCardProps {
    user: User
    plan: Plan
}

export function AccountCard({ user, plan }: AccountCardProps) {
    const navigate = useNavigate()
    const isTrial = plan === 'trial' || plan === 'limited'

    async function handleSignOut() {
        await supabase.auth.signOut()
    }

    return (
        <div className="rounded-2xl border border-border p-5 space-y-4 flex flex-col">
            <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</p>
                <p className="text-sm font-medium text-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                    Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
            </div>
            <div className="border-t border-border pt-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</p>
                <p className="text-sm font-medium text-foreground">{PLAN_LABEL[plan] ?? plan}</p>
                <p className="text-xs text-muted-foreground">
                    {isTrial ? 'Limited conversions — upgrade for unlimited access.' : 'Unlimited conversions.'}
                </p>
            </div>
            <div className="flex gap-2 flex-1 items-end">
                {isTrial && <Button size="sm" onClick={() => navigate('/pricing')}>Upgrade</Button>}
                <Button variant="outline" size="sm" onClick={handleSignOut}>Sign out</Button>
            </div>
        </div>
    )
}
