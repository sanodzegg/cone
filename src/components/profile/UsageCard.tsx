import { TRIAL_LIMITS, LIMITED_DAILY_LIMITS, getDailyCounts } from '@/lib/useConversionCount'
import type { ConversionCounts } from '@/lib/useConversionCount'
import type { Plan } from '@/lib/useAuth'
import { cn } from '@/lib/utils'
import { Image, FileText, Video, Music } from 'lucide-react'

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

const ROW_ICONS = {
    Images: Image,
    Documents: FileText,
    Videos: Video,
    Audio: Music,
}

interface UsageCardProps {
    plan: Plan
    counts: ConversionCounts
}

export function UsageCard({ plan, counts }: UsageCardProps) {
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

    const totalStats = [
        { label: 'Images', value: counts.image, icon: Image },
        { label: 'Documents', value: counts.document, icon: FileText },
        { label: 'Videos', value: counts.video, icon: Video },
        { label: 'Audio', value: counts.audio, icon: Music },
    ]

    return (
        <div className="rounded-2xl border border-border p-5 space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Usage</p>
            {isFreeplan ? (
                <div className="space-y-3">
                    {rows.map(({ label, used, limit, isDaily }) => {
                        const Icon = ROW_ICONS[label as keyof typeof ROW_ICONS]
                        return (
                            <div key={label} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <Icon className="size-4" />
                                        {label}
                                    </p>
                                    <p className="text-sm text-foreground tabular-nums">
                                        {used} / {limit}
                                        {isDaily && <span className="text-muted-foreground"> today</span>}
                                    </p>
                                </div>
                                <UsageBar used={used} limit={limit} />
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {totalStats.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center gap-2.5">
                            <div className="size-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0">
                                <Icon className="size-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-base font-medium text-foreground tabular-nums">{value.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
