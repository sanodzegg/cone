import { useNavigate } from 'react-router-dom'
import type { Plan } from '@/lib/useAuth'
import { Button } from '@/components/ui/button'
import { Clock, Timer, Zap, Star, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLAN_CONFIG: Record<Plan, { label: string; icon: typeof Clock; color: string; description: string }> = {
    trial: {
        label: 'Trial',
        icon: Clock,
        color: 'text-muted-foreground',
        description: 'Limited conversions included. Upgrade for unlimited access.',
    },
    limited: {
        label: 'Limited',
        icon: Timer,
        color: 'text-muted-foreground',
        description: 'Daily conversion limits. Upgrade for unlimited access.',
    },
    monthly: {
        label: 'Pro — Monthly',
        icon: Zap,
        color: 'text-primary',
        description: 'Unlimited conversions, billed monthly.',
    },
    annual: {
        label: 'Pro — Annual',
        icon: Zap,
        color: 'text-primary',
        description: 'Unlimited conversions, billed annually. You save 20%.',
    },
    lifetime: {
        label: 'Lifetime',
        icon: Star,
        color: 'text-primary',
        description: 'Unlimited conversions, forever. No renewals.',
    },
}

interface PlanCardProps {
    plan: Plan
}

export function PlanCard({ plan }: PlanCardProps) {
    const navigate = useNavigate()
    const config = PLAN_CONFIG[plan]
    const Icon = config.icon
    const isFree = plan === 'trial' || plan === 'limited'
    const isPaid = plan === 'monthly' || plan === 'annual'

    return (
        <div className="rounded-2xl border border-border p-5 space-y-4">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Plan</p>

            <div className="flex items-center gap-3">
                <div className={cn("size-11 rounded-full flex items-center justify-center shrink-0", isFree ? "bg-foreground/10" : "bg-primary/10")}>
                    <Icon className={cn("size-5", config.color)} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{config.label}</p>
                        <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            isFree ? "bg-foreground/10 text-muted-foreground" : "bg-primary/10 text-primary"
                        )}>
                            {isFree ? 'Free' : 'Active'}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isFree && (
                    <Button size="sm" onClick={() => navigate('/pricing')} className="gap-1.5">
                        Upgrade
                        <ArrowUpRight className="size-3.5" />
                    </Button>
                )}
                {isPaid && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                            Change plan
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            Cancel subscription
                        </Button>
                    </>
                )}
                {plan === 'lifetime' && (
                    <p className="text-xs text-muted-foreground">No action needed — you own Cone forever.</p>
                )}
            </div>
        </div>
    )
}
