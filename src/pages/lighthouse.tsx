import { useState, useEffect } from 'react'
import { Gauge, Download, Loader2, AlertCircle, WifiOff, RotateCcw, Globe, Check, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type LighthouseStatus = { installed: boolean; version: string | null }
type Scores = { performance: number; accessibility: number; bestPractices: number; seo: number }
type WebVitals = { lcp: string | null; fcp: string | null; cls: string | null; tbt: string | null; si: string | null }
type Issue = { id: string; title: string; score: number | null; displayValue: string | null }
type AuditResult = { success: boolean; error?: string; scores?: Scores; webVitals?: WebVitals; topIssues?: Issue[] }
type Results = { desktop: AuditResult | null; mobile: AuditResult | null }

function scoreColor(score: number) {
  if (score >= 90) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

function scoreRingColor(score: number) {
  if (score >= 90) return 'stroke-green-500'
  if (score >= 50) return 'stroke-yellow-500'
  return 'stroke-red-500'
}

function ScoreCircle({ label, score }: { label: string; score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative size-20">
        <svg className="size-20 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-border" />
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-700', scoreRingColor(score))}
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-lg font-bold', scoreColor(score))}>
          {score}
        </span>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  )
}

function VitalChip({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3 min-w-24 items-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value ?? '—'}</span>
    </div>
  )
}

function DownloadCircle({ pct }: { pct: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const done = pct >= 100

  return (
    <div className="relative size-14">
      <svg className="size-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="stroke-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {done ? <Check className="size-5 text-primary" /> : <Download className="size-4 text-primary" />}
      </span>
    </div>
  )
}

function AuditResultView({ result, onRetry }: { result: AuditResult; onRetry: () => void }) {
  if (!result.success) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 flex items-center gap-3">
        <AlertCircle className="size-5 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-medium text-destructive">Audit failed</p>
          <p className="text-xs text-muted-foreground mt-0.5">{result.error}</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto gap-1.5 cursor-pointer" onClick={onRetry}>
          <RotateCcw className="size-3.5" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {result.scores && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex justify-around">
            <ScoreCircle label="Performance" score={result.scores.performance} />
            <ScoreCircle label="Accessibility" score={result.scores.accessibility} />
            <ScoreCircle label="Best Practices" score={result.scores.bestPractices} />
            <ScoreCircle label="SEO" score={result.scores.seo} />
          </div>
        </div>
      )}

      {result.webVitals && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-foreground mb-3">Core Web Vitals</p>
          <div className="flex gap-3 flex-wrap">
            <VitalChip label="LCP" value={result.webVitals.lcp} />
            <VitalChip label="FCP" value={result.webVitals.fcp} />
            <VitalChip label="CLS" value={result.webVitals.cls} />
            <VitalChip label="TBT" value={result.webVitals.tbt} />
            <VitalChip label="Speed Index" value={result.webVitals.si} />
          </div>
        </div>
      )}

      {result.topIssues && result.topIssues.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-medium text-foreground mb-3">Top Issues</p>
          <div className="flex flex-col">
            {result.topIssues.map(issue => (
              <div key={issue.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={cn('text-xs font-bold w-8 text-center shrink-0', scoreColor(Math.round((issue.score ?? 0) * 100)))}>
                  {issue.score !== null ? Math.round(issue.score * 100) : '—'}
                </div>
                <span className="text-sm text-foreground flex-1">{issue.title}</span>
                {issue.displayValue && (
                  <span className="text-xs text-muted-foreground shrink-0">{issue.displayValue}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Lighthouse() {
  const [status, setStatus] = useState<LighthouseStatus | null>(null)
  const [installing, setInstalling] = useState(false)
  const [installPct, setInstallPct] = useState(0)
  const [installError, setInstallError] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')
  const [running, setRunning] = useState(false)
  const [runningDesktop, setRunningDesktop] = useState(false)
  const [runningMobile, setRunningMobile] = useState(false)
  const [results, setResults] = useState<Results>({ desktop: null, mobile: null })
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    window.electron.lighthouseStatus().then(setStatus)
    const unsub = window.electron.onLighthouseInstallProgress((data) => {
      if (data.status === 'progress') {
        setInstallPct(data.pct ?? 0)
      } else if (data.status === 'done') {
        setInstallPct(100)
        setTimeout(() => {
          setInstalling(false)
          setInstallPct(0)
          setStatus({ installed: true, version: data.version ?? null })
        }, 600)
      } else if (data.status === 'error') {
        setInstalling(false)
        setInstallPct(0)
        setInstallError(data.error ?? 'Installation failed')
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  function install() {
    setInstalling(true)
    setInstallPct(0)
    setInstallError(null)
    window.electron.lighthouseInstall()
  }

  async function runAudit() {
    if (!url.trim()) return
    const normalized = url.startsWith('http') ? url : `https://${url}`
    setRunning(true)
    setRunningDesktop(true)
    setRunningMobile(true)
    setResults({ desktop: null, mobile: null })

    const [desktop, mobile] = await Promise.all([
      window.electron.lighthouseRun({ url: normalized, strategy: 'desktop' }).finally(() => setRunningDesktop(false)),
      window.electron.lighthouseRun({ url: normalized, strategy: 'mobile' }).finally(() => setRunningMobile(false)),
    ])

    setResults({ desktop, mobile })
    setRunning(false)
  }

  if (!isOnline) {
    return (
      <section className="section py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-body font-semibold">Lighthouse Audit</h2>
          <p className="text-sm text-muted-foreground mt-1">Audit any website for performance, accessibility, SEO and best practices.</p>
        </div>
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 flex flex-col items-center justify-center gap-3 text-center h-64">
          <WifiOff className="size-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">No internet connection</p>
          <p className="text-xs text-muted-foreground">Lighthouse audits require an active internet connection.</p>
        </div>
      </section>
    )
  }

  if (status && !status.installed) {
    return (
      <section className="section py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-body font-semibold">Lighthouse Audit</h2>
          <p className="text-sm text-muted-foreground mt-1">Audit any website for performance, accessibility, SEO and best practices.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center gap-4 text-center">
          <Gauge className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Lighthouse is not installed</p>
            <p className="text-sm text-muted-foreground mt-1">Download the Lighthouse CLI (~70MB) to run audits locally.</p>
          </div>
          {installError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="size-4 shrink-0" />
              {installError}
            </div>
          )}
          {installing ? (
            <div className="flex flex-col items-center gap-3">
              <DownloadCircle pct={installPct} />
              <p className="text-xs text-muted-foreground">Downloading Lighthouse… {installPct}%</p>
            </div>
          ) : (
            <Button onClick={install} className="gap-2 cursor-pointer">
              <Download className="size-4" />
              Download Lighthouse
            </Button>
          )}
        </div>
      </section>
    )
  }

  const hasResults = results.desktop !== null || results.mobile !== null
  const activeResult = results[view]

  return (
    <section className="section py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-body font-semibold">Lighthouse Audit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Audit any website for performance, accessibility, SEO and best practices.
          {status?.version && <span className="ml-2 text-xs text-muted-foreground/60">v{status.version}</span>}
        </p>
      </div>

      {/* URL input + run */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !running && runAudit()}
            disabled={running}
          />
        </div>
        <Button onClick={runAudit} disabled={running || !url.trim()} className="gap-2 cursor-pointer shrink-0">
          {running ? <Loader2 className="size-4 animate-spin" /> : <Gauge className="size-4" />}
          {running ? 'Auditing…' : 'Run Audit'}
        </Button>
      </div>

      {/* Running state */}
      {running && (
        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            Running desktop and mobile audits in parallel
            {runningDesktop && runningMobile ? '…' : runningDesktop ? ' — mobile done, finishing desktop…' : ' — desktop done, finishing mobile…'}
          </p>
        </div>
      )}

      {/* Results */}
      {!running && hasResults && (
        <div className="flex flex-col gap-4">
          {/* Switcher */}
          <div className="flex rounded-lg border border-border overflow-hidden self-start">
            <button
              onClick={() => setView('desktop')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                view === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Monitor className="size-4" />
              Desktop
              {results.desktop?.success && results.desktop.scores && (
                <span className={cn('text-xs font-bold', view === 'desktop' ? 'text-primary-foreground' : scoreColor(results.desktop.scores.performance))}>
                  {results.desktop.scores.performance}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('mobile')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                view === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Smartphone className="size-4" />
              Mobile
              {results.mobile?.success && results.mobile.scores && (
                <span className={cn('text-xs font-bold', view === 'mobile' ? 'text-primary-foreground' : scoreColor(results.mobile.scores.performance))}>
                  {results.mobile.scores.performance}
                </span>
              )}
            </button>
          </div>

          {activeResult && <AuditResultView result={activeResult} onRetry={runAudit} />}
        </div>
      )}
    </section>
  )
}
