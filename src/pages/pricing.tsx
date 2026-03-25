import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Interval = 'monthly' | 'annual'

const TRIAL_FEATURES = [
    '500 image conversions',
    '500 document conversions',
    '100 video conversions',
    'Image editor',
    'Favicon generator',
    'Settings sync across devices',
]

const PRO_FEATURES = [
    'Unlimited conversions',
    'Bulk converter',
    'Watch folder mode',
    'Image editor',
    'Favicon generator',
    'Settings sync across devices',
    'Priority support',
]

const LIFETIME_FEATURES = [
    'Everything in Pro',
    'One-time payment, never pay again',
    'All future updates included',
]

export default function Pricing() {
    const [interval, setInterval] = useState<Interval>('annual')

    return (
        <section className="section py-8">
            <div className="mb-8">
                <h2 className="text-2xl font-body font-semibold text-foreground">Pricing</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Simple pricing. No hidden fees.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Trial */}
                <div className="rounded-2xl border border-border p-6 flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Trial</p>
                        <p className="text-3xl font-semibold text-foreground">Free</p>
                        <p className="text-sm text-muted-foreground mt-1">Get started, no account needed.</p>
                    </div>
                    <ul className="flex flex-col gap-2 flex-1">
                        {TRIAL_FEATURES.map(f => (
                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <Button variant="outline" disabled className="w-full">Current plan</Button>
                </div>

                {/* Monthly / Annual */}
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-6 flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">Pro</p>
                        <div className="flex items-end gap-1.5">
                            <p className="text-3xl font-semibold text-foreground">
                                {interval === 'monthly' ? '$4.99' : '$3.99'}
                            </p>
                            <p className="text-sm text-muted-foreground mb-1">/month</p>
                        </div>
                        {interval === 'annual' && (
                            <p className="text-xs text-primary mt-0.5">Billed annually — save 20%</p>
                        )}
                        <div className="flex gap-1.5 mt-3">
                            <button
                                onClick={() => setInterval('monthly')}
                                className={cn(
                                    'text-xs px-3 py-1 rounded-full border transition-colors',
                                    interval === 'monthly'
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border text-muted-foreground hover:border-primary/50'
                                )}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setInterval('annual')}
                                className={cn(
                                    'text-xs px-3 py-1 rounded-full border transition-colors',
                                    interval === 'annual'
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border text-muted-foreground hover:border-primary/50'
                                )}
                            >
                                Annual
                            </button>
                        </div>
                    </div>
                    <ul className="flex flex-col gap-2 flex-1">
                        {PRO_FEATURES.map(f => (
                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <Button className="w-full">Get Pro</Button>
                </div>

                {/* Lifetime */}
                <div className="rounded-2xl border border-border p-6 flex flex-col gap-4">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Lifetime</p>
                        <p className="text-3xl font-semibold text-foreground">$49</p>
                        <p className="text-sm text-muted-foreground mt-1">Pay once, own it forever.</p>
                    </div>
                    <ul className="flex flex-col gap-2 flex-1">
                        {LIFETIME_FEATURES.map(f => (
                            <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                                {f}
                            </li>
                        ))}
                    </ul>
                    <Button variant="outline" className="w-full">Get Lifetime</Button>
                </div>
            </div>
        </section>
    )
}
