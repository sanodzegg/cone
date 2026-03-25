import { useState, useMemo } from "react"
import SvgDropzone from "@/components/svg-editor/svg-dropzone"
import { Button } from "@/components/ui/button"
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from "@/components/ui/combobox"
import { cn } from "@/lib/utils"
import { Check, Copy, RotateCcw } from "lucide-react"
import {
    optimizeSvg, toBase64Uri, toEncodedUri, toMinifiedUri,
    byteSize, toCodeSnippet, CODE_FORMAT_OPTIONS, type CodeFormat,
} from "@/components/svg-editor/svg-utils"

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = 'preview' | 'code' | 'data-uri'

const BG_OPTIONS = [
    { label: 'Transparent', value: 'transparent', class: 'bg-[url(\'data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'8\\\' height=\\\'8\\\'%3E%3Crect width=\\\'4\\\' height=\\\'4\\\' fill=\\\'%23ccc\\\'/%3E%3Crect x=\\\'4\\\' y=\\\'4\\\' width=\\\'4\\\' height=\\\'4\\\' fill=\\\'%23ccc\\\'/%3E%3C/svg%3E\')]' },
    { label: 'White', value: 'white', class: 'bg-white' },
    { label: 'Black', value: 'black', class: 'bg-black' },
    { label: 'Gray', value: 'gray', class: 'bg-zinc-800' },
]

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }
    return (
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copy}>
            {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        </Button>
    )
}

function DataUriRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{byteSize(value)}</span>
                    <CopyButton text={value} />
                </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-xs text-muted-foreground break-all line-clamp-3 select-all">
                {value}
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SvgEditor() {
    const [code, setCode] = useState<string | null>(null)
    const [tab, setTab] = useState<Tab>('preview')
    const [bg, setBg] = useState('white')
    const [codeFormat, setCodeFormat] = useState<CodeFormat>('SVG')
    const [optimized, setOptimized] = useState(false)

    const optimizedCode = useMemo(() => optimizeSvg(code ?? ''), [code])

    const savings = useMemo(() => {
        if (!code) return 0
        const before = new TextEncoder().encode(code).length
        const after = new TextEncoder().encode(optimizedCode).length
        return before === 0 ? 0 : Math.round((1 - after / before) * 100)
    }, [code, optimizedCode])

    const displayCode = useMemo(() => {
        if (!code) return ''
        const base = optimized ? optimizedCode : code
        return toCodeSnippet(base, codeFormat)
    }, [code, optimized, optimizedCode, codeFormat])

    const bgClass = BG_OPTIONS.find(b => b.value === bg)?.class ?? 'bg-white'

    if (!code) {
        return (
            <section className="section py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-body font-semibold text-foreground">SVG Editor</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Upload or paste an SVG to preview, export code snippets, and generate Data URIs.
                    </p>
                </div>
                <SvgDropzone onSvg={setCode} />
            </section>
        )
    }

    return (
        <section className="section py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-body font-semibold text-foreground">SVG Editor</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Upload or paste an SVG to preview, export code snippets, and generate Data URIs.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setCode(null); setOptimized(false) }}>
                    <RotateCcw className="size-3.5 mr-1.5" />
                    New SVG
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 h-140">
                {/* Left — code editor */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Source</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={optimized ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setOptimized(o => !o)}
                            >
                                {optimized ? 'Optimized' : savings > 0 ? `Optimize −${savings}%` : 'Optimize'}
                            </Button>
                            <CopyButton text={optimized ? optimizedCode : code} />
                        </div>
                    </div>
                    <textarea
                        value={optimized ? optimizedCode : code}
                        onChange={e => { setCode(e.target.value); setOptimized(false) }}
                        className="flex-1 w-full rounded-xl border border-border bg-muted/30 text-xs text-foreground font-mono p-3 resize-none focus:outline-none focus:border-primary transition-colors"
                        spellCheck={false}
                    />
                </div>

                {/* Right — tabs */}
                <div className="flex flex-col gap-2 min-h-0">
                    {/* Tab bar */}
                    <div className="flex items-center gap-1 border-b border-border pb-2">
                        {(['preview', 'code', 'data-uri'] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    "px-3 py-1 text-xs rounded-md transition-colors",
                                    tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                )}
                            >
                                {t === 'data-uri' ? 'Data URI' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Preview tab */}
                    {tab === 'preview' && (
                        <div className="flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-2">
                                {BG_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setBg(opt.value)}
                                        title={opt.label}
                                        className={cn(
                                            "h-6 w-6 rounded-md border-2 transition-colors",
                                            opt.value === 'transparent' ? "bg-[repeating-conic-gradient(#ccc_0%_25%,white_0%_50%)] bg-size-[8px_8px]" :
                                            opt.value === 'white' ? "bg-white" :
                                            opt.value === 'black' ? "bg-black" : "bg-zinc-800",
                                            bg === opt.value ? "border-primary" : "border-border"
                                        )}
                                    />
                                ))}
                            </div>
                            <div className={cn("flex-1 rounded-xl flex items-center justify-center overflow-hidden", bgClass)}>
                                <div
                                    className="w-full h-full"
                                    dangerouslySetInnerHTML={{ __html: code
                                        .replace(/<\?xml[^>]*\?>\s*/g, '')
                                        .replace(/<svg([^>]*)>/, (_, attrs) => {
                                            const hasW = /\bwidth=/.test(attrs)
                                            const hasH = /\bheight=/.test(attrs)
                                            const w = hasW ? '' : ' width="100%"'
                                            const h = hasH ? '' : ' height="100%"'
                                            return `<svg${attrs}${w}${h}>`
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Code tab */}
                    {tab === 'code' && (
                        <div className="flex flex-col gap-3 flex-1 min-h-0">
                            <div className="flex items-center justify-between">
                                <Combobox value={codeFormat} onValueChange={v => v && setCodeFormat(v as CodeFormat)} items={CODE_FORMAT_OPTIONS.map(o => o.value)} filter={null}>
                                    <ComboboxInput className="w-36! h-8! [&_input]:select-none!" readOnly />
                                    <ComboboxContent>
                                        <ComboboxList>
                                            {(item) => (
                                                <ComboboxItem key={item} value={item}>
                                                    {CODE_FORMAT_OPTIONS.find(o => o.value === item)?.label ?? item}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                                <CopyButton text={displayCode} />
                            </div>
                            <pre className="flex-1 min-h-0 rounded-xl border border-border bg-muted/30 p-3 text-xs font-mono text-foreground overflow-auto whitespace-pre-wrap break-all">
                                {displayCode}
                            </pre>
                        </div>
                    )}

                    {/* Data URI tab */}
                    {tab === 'data-uri' && (
                        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
                            <DataUriRow label="Base64" value={toBase64Uri(code)} />
                            <DataUriRow label="encodeURIComponent" value={toEncodedUri(code)} />
                            <DataUriRow label="Minified (encodeURIComponent)" value={toMinifiedUri(code)} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
