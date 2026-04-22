import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { LogOut, Mail, Calendar } from 'lucide-react'

interface AccountCardProps {
    user: User
}

export function AccountCard({ user }: AccountCardProps) {
    async function handleSignOut() {
        await supabase.auth.signOut()
    }

    const provider = user.app_metadata?.provider
    const providerLabel =
        provider === 'google' ? 'Google' :
        provider === 'github' ? 'GitHub' :
        'Email'

    return (
        <div className="rounded-2xl border border-border p-5 space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account</p>

            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-base font-semibold text-primary">
                            {(user.email?.[0] ?? '?').toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-medium text-foreground truncate">{user.email}</p>
                        <p className="text-sm text-muted-foreground">Signed in with {providerLabel}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="size-4" />
                        Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </div>

            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="size-3.5" />
                Sign out
            </Button>
        </div>
    )
}
