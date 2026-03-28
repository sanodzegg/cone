import { useState } from 'react'
import { Clock, Zap, Star } from 'lucide-react'
import { PricingCard } from '@/components/pricing/pricing-card'
import { useAuth } from '@/lib/useAuth'
import pricingBg from '@/assets/pricing-bg.webm'

type Interval = 'monthly' | 'annual'

const PLANS = [
    {
        id: 'trial',
        icon: Clock,
        title: 'Basic',
        description: 'Free to get started',
        price: 0,
        features: [
            '500 image conversions',
            '500 document conversions',
            '100 video conversions',
            'Image editor',
            'Favicon generator',
            'SVG editor',
        ],
        ctaLabel: 'Get started',
        ctaVariant: 'outline' as const,
    },
    {
        id: 'pro',
        icon: Zap,
        title: 'Pro',
        description: 'Billed monthly or annually',
        price: { monthly: 4.99, annual: 3.99 },
        priceSuffix: '/mo',
        features: [
            'Unlimited conversions',
            'Bulk converter + watch folder mode',
            'Image editor',
            'Favicon generator',
            'SVG editor',
            'Settings sync across devices',
            'Priority support',
        ],
        ctaLabel: 'Get Pro',
        ctaVariant: 'default' as const,
    },
    {
        id: 'lifetime',
        icon: Star,
        title: 'Lifetime',
        description: 'Pay once, own it forever.',
        price: 49,
        features: [
            'Everything in Pro, forever',
            'One-time payment — no renewals',
            'Offline license key, works without internet',
            'All future updates included',
        ],
        ctaLabel: 'Get Lifetime',
        ctaVariant: 'outline' as const,
    },
]

export default function Pricing() {
    const { plan } = useAuth()
    const [interval, setInterval] = useState<Interval>('annual')
    const [videoReady, setVideoReady] = useState(false)

    return (
        <section className="relative overflow-hidden min-h-[calc(100vh-var(--nav-height))]">
            <div className='section py-8 2xl:py-12'>
                <video
                    src={pricingBg}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onCanPlay={() => setVideoReady(true)}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none hidden dark:block transition-opacity duration-700"
                    style={{ opacity: videoReady ? .7 : 0 }}
                />
                <div className="relative z-10 mb-10 2xl:mb-14 text-center">
                    <h2 className="text-4xl 2xl:text-5xl font-body font-semibold text-foreground mb-3 2xl:mb-4">Simple, transparent pricing</h2>
                    <p className="text-sm 2xl:text-base text-muted-foreground">No subscriptions required. Start free, upgrade when you need more.</p>
                </div>
                <div className="relative z-10 grid grid-cols-3 gap-4 2xl:gap-6 items-center">
                    {PLANS.map(p => {
                        const isCurrent =
                            (p.id === 'trial' && plan === 'trial') ||
                            (p.id === 'pro' && (plan === 'monthly' || plan === 'annual')) ||
                            (p.id === 'lifetime' && plan === 'lifetime')
                        const badge = isCurrent ? 'current' : p.id === 'pro' ? 'popular' : p.id === 'lifetime' ? 'best-value' : undefined
                        return (
                            <PricingCard
                                key={p.id}
                                icon={p.icon}
                                title={p.title}
                                description={p.description}
                                price={p.price}
                                priceSuffix={p.priceSuffix}
                                features={p.features}
                                ctaLabel={p.ctaLabel}
                                ctaVariant={p.ctaVariant}
                                badge={badge}
                                {...(p.id === 'pro' && { interval, onIntervalChange: setInterval })}
                            />
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
