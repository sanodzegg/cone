import { useState, useEffect } from 'react'
import { FileDown, RotateCcw, Loader2, Globe, Download, AlertCircle, WifiOff, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type Status = 'idle' | 'generating' | 'done' | 'error' | 'timeout'

const PAPER_FORMATS = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A6']
const WAIT_UNTIL_OPTIONS: { value: 'load' | 'domcontentloaded' | 'networkidle'; label: string; exclamation?: string }[] = [
  { value: 'domcontentloaded', label: 'DOM ready' },
  { value: 'load', label: 'Load event' },
  { value: 'networkidle', label: 'Network idle', exclamation: 'Pages can take a long time to fully load all network requests and may result in a timeout.' },
]
const VIEWPORT_PRESETS = [
  { label: 'Mobile', value: 390 },
  { label: 'Tablet', value: 768 },
  { label: 'Desktop', value: 1440 },
  { label: 'Wide', value: 1920 },
]

export default function WebsitePdf() {
  const [url, setUrl] = useState('')
  const [viewportWidth, setViewportWidth] = useState(1440)
  const [format, setFormat] = useState('A4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [marginTop, setMarginTop] = useState(10)
  const [marginBottom, setMarginBottom] = useState(10)
  const [marginLeft, setMarginLeft] = useState(10)
  const [marginRight, setMarginRight] = useState(10)
  const [printBackground, setPrintBackground] = useState(true)
  const [waitUntil, setWaitUntil] = useState<'load' | 'domcontentloaded' | 'networkidle'>('domcontentloaded')
  const [waitTime, setWaitTime] = useState(0)
  const [waitTimeRaw, setWaitTimeRaw] = useState('0')

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [buffer, setBuffer] = useState<number[] | null>(null)
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    return window.electron.onWebsitePdfWaiting(({ waitTime }) => {
      const endAt = Date.now() + waitTime
      setCountdown(Math.ceil(waitTime / 1000))
      const interval = setInterval(() => {
        const remaining = Math.ceil((endAt - Date.now()) / 1000)
        if (remaining <= 0) {
          setCountdown(null)
          clearInterval(interval)
        } else {
          setCountdown(remaining)
        }
      }, 250)
    })
  }, [])

  const normalizeUrl = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const generate = async () => {
    const normalized = normalizeUrl(url)
    setUrl(normalized)
    setStatus('generating')
    setError(null)
    setBuffer(null)
    setSavedPath(null)
    try {
      const result = await window.electron.websitePdfGenerate({
        url: normalized, viewportWidth, format, orientation,
        marginTop, marginBottom, marginLeft, marginRight,
        printBackground, waitUntil, waitTime,
      })
      setBuffer(result.buffer)
      setStatus('done')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setStatus(message.toLowerCase().includes('timeout') ? 'timeout' : 'error')
      setError(message)
    }
  }

  const save = async () => {
    if (!buffer) return
    const result = await window.electron.websitePdfSave({ buffer, url })
    if (!result.canceled && result.filePath) setSavedPath(result.filePath)
  }

  const reset = () => {
    setUrl('')
    setStatus('idle')
    setError(null)
    setBuffer(null)
    setSavedPath(null)
    setCountdown(null)
  }

  const isGenerating = status === 'generating'
  const isDone = status === 'done'
  const isError = status === 'error' || status === 'timeout'

  if (!isOnline) {
    return (
      <section className="section py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-body font-semibold text-foreground">Download as PDF</h2>
          <p className="text-sm text-muted-foreground mt-1">Save any webpage as a PDF file.</p>
        </div>
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-8 flex flex-col items-center justify-center gap-3 text-center h-64">
          <WifiOff className="size-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">No internet connection</p>
            <p className="text-xs text-muted-foreground mt-1">This feature requires an active internet connection.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-body font-semibold text-foreground">Download as PDF</h2>
          <p className="text-sm text-muted-foreground mt-1">Save any webpage as a PDF file.</p>
        </div>
        {(isDone || isError) && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 shrink-0">
            <RotateCcw className="size-3.5" /> Reset
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: all controls */}
        <div className="w-72 shrink-0 space-y-4">

          {/* URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">URL</Label>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onBlur={() => setUrl(normalizeUrl(url))}
              disabled={isGenerating}
              className="text-sm"
            />
          </div>

          {/* Paper format */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Paper format</Label>
            <div className="flex flex-wrap gap-1.5">
              {PAPER_FORMATS.map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  disabled={isGenerating}
                  className={cn(
                    'cursor-pointer rounded-lg border px-2.5 py-1 text-xs transition-colors',
                    format === f
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Orientation</Label>
            <div className="flex gap-1.5">
              {(['portrait', 'landscape'] as const).map(o => (
                <button
                  key={o}
                  onClick={() => setOrientation(o)}
                  disabled={isGenerating}
                  className={cn(
                    'cursor-pointer flex-1 rounded-lg border py-1.5 text-xs capitalize transition-colors',
                    orientation === o
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Margins (mm)</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { label: 'Top', value: marginTop, set: setMarginTop },
                { label: 'Bottom', value: marginBottom, set: setMarginBottom },
                { label: 'Left', value: marginLeft, set: setMarginLeft },
                { label: 'Right', value: marginRight, set: setMarginRight },
              ]).map(({ label, value, set }) => (
                <div key={label}>
                  <span className="text-[10px] text-muted-foreground mb-0.5 block">{label}</span>
                  <Input
                    type="number"
                    value={value}
                    onChange={e => set(Number(e.target.value))}
                    disabled={isGenerating}
                    min={0}
                    max={50}
                    className="text-sm h-8"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Print background */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Print background</Label>
            <button
              role="checkbox"
              aria-checked={printBackground}
              onClick={() => setPrintBackground(v => !v)}
              disabled={isGenerating}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                printBackground ? 'bg-primary' : 'bg-accent'
              )}
            >
              <span className={cn(
                'pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform',
                printBackground ? 'translate-x-4' : 'translate-x-0'
              )} />
            </button>
          </div>

          {/* Wait until */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Wait until</Label>
            <div className="flex flex-col gap-1.5">
              {WAIT_UNTIL_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setWaitUntil(o.value)}
                  disabled={isGenerating}
                  className={cn(
                    'cursor-pointer rounded-lg border px-3 py-1.5 text-xs text-left transition-colors',
                    waitUntil === o.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                    o.exclamation && 'flex items-center justify-between'
                  )}
                >
                  {o.label} {o.exclamation &&
                    <Tooltip>
                      <TooltipTrigger>
                        <CircleAlert className={`size-3 ${waitUntil === o.value && 'text-yellow-500'}`} />
                        <TooltipContent>
                          <p className="text-sm font-light text-accent">{o.exclamation}</p>
                        </TooltipContent>
                      </TooltipTrigger>
                    </Tooltip>
                  }
                </button>
              ))}
            </div>
          </div>

          {/* Extra wait time */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Extra wait time (ms)</Label>
            <Input
              type="number"
              value={waitTimeRaw}
              onChange={e => setWaitTimeRaw(e.target.value)}
              onBlur={() => {
                const n = Math.max(0, Math.min(30000, Number(waitTimeRaw) || 0))
                setWaitTime(n)
                setWaitTimeRaw(String(n))
              }}
              disabled={isGenerating}
              min={0}
              max={30000}
              step={500}
              className="text-sm"
            />
          </div>

          {/* Viewport width */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Viewport width</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {VIEWPORT_PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setViewportWidth(p.value)}
                  disabled={isGenerating}
                  className={cn(
                    'cursor-pointer rounded-lg border py-1.5 text-xs transition-colors',
                    viewportWidth === p.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {p.label}
                  <span className="block text-[10px] opacity-60">{p.value}px</span>
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={viewportWidth}
              onChange={e => setViewportWidth(Number(e.target.value))}
              disabled={isGenerating}
              className="text-sm"
              min={320}
              max={3840}
            />
          </div>

          {/* Generate */}
          <Button className="w-full gap-2" size="sm" onClick={generate} disabled={isGenerating || !url}>
            {isGenerating
              ? <><Loader2 className="size-3.5 animate-spin" /> Generating…</>
              : <><FileDown className="size-3.5" /> Generate PDF</>
            }
          </Button>

          {isDone && buffer && (
            <Button variant="outline" className="w-full gap-2" size="sm" onClick={save}>
              <Download className="size-3.5" />
              {savedPath ? 'Save again' : 'Download PDF'}
            </Button>
          )}

          {savedPath && <p className="text-[10px] text-muted-foreground break-all">{savedPath}</p>}
        </div>

        {/* Right: status */}
        <div className="flex-1 min-w-0">
          {isDone && buffer ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 flex flex-col items-center justify-center gap-3 text-center h-64">
              <FileDown className="size-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-500">PDF ready</p>
                <p className="text-xs text-muted-foreground mt-1">Click Download PDF to save it.</p>
              </div>
            </div>
          ) : status === 'timeout' ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 flex flex-col items-center justify-center gap-3 text-center h-64">
              <AlertCircle className="size-8 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Page timed out</p>
                <p className="text-xs text-muted-foreground mt-1">The page took too long to load.</p>
              </div>
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 flex flex-col items-center justify-center gap-3 text-center h-64">
              <AlertCircle className="size-8 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed to generate PDF</p>
                <p className="text-[10px] text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center justify-center gap-3 text-center h-64">
              <Loader2 className="size-8 text-muted-foreground animate-spin" />
              <div>
                <p className="text-sm text-muted-foreground">Generating PDF…</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {countdown !== null ? `Waiting ${countdown}s…` : 'Loading page and rendering'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center justify-center gap-3 text-center h-64">
              <Globe className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Enter a URL and click Generate PDF</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
