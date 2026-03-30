import { TRIAL_LIMITS, LIMITED_DAILY_LIMITS, getDailyCounts } from '@/lib/useConversionCount'
import type { ConversionCounts } from '@/lib/useConversionCount'
import type { Plan } from '@/lib/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

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

interface UsageCardProps {
    plan: Plan
    counts: ConversionCounts
}

export function UsageCard({ plan, counts }: UsageCardProps) {
    const navigate = useNavigate()
    const isFreeplan = plan === 'trial' || plan === 'limited'
    const daily = getDailyCounts()

    const rows: { label: string; used: number; limit: number; isDaily: boolean }[] = isFreeplan ? [
        plan === 'limited' || counts.image >= TRIAL_LIMITS.image
            ? { label: 'Images', used: daily.image, limit: LIMITED_DAILY_LIMITS.image, isDaily: true }
            : { label: 'Images', used: counts.image, limit: TRIAL_LIMITS.image, isDaily: false },
        plan === 'limited' || counts.document >= TRIAL_LIMITS.document
            ? { label: 'Documents', used: daily.document, limit: LIMITED_DAILY_LIMITS.document, isDaily: true }
            : { label: 'Documents', used: counts.document, limit: TRIAL_LIMITS.document, isDaily: false },
        plan === 'limited' || counts.video >= TRIAL_LIMITS.video
            ? { label: 'Videos', used: daily.video, limit: LIMITED_DAILY_LIMITS.video, isDaily: true }
            : { label: 'Videos', used: counts.video, limit: TRIAL_LIMITS.video, isDaily: false },
        plan === 'limited' || counts.audio >= TRIAL_LIMITS.audio
            ? { label: 'Audio', used: daily.audio, limit: LIMITED_DAILY_LIMITS.audio, isDaily: true }
            : { label: 'Audio', used: counts.audio, limit: TRIAL_LIMITS.audio, isDaily: false },
    ] : []

    return (
        <div className="rounded-2xl border border-border p-5 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usage</p>
            {isFreeplan ? (
                <div className="space-y-4">
                    <div className="space-y-3">
                        {rows.map(({ label, used, limit, isDaily }) => (
                            <div key={label} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    <p className="text-xs text-foreground">
                                        {used} / {limit}
                                        {isDaily && <span className="text-muted-foreground"> today</span>}
                                    </p>
                                </div>
                                <UsageBar used={used} limit={limit} />
                            </div>
                        ))}
                    </div>
                    <Button variant="default" className="w-fit" onClick={() => navigate('/pricing')}>
                        {plan === 'trial' ? 'Upgrade to Limited or Pro' : 'Upgrade to Pro'}
                    </Button>
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
    )
}
