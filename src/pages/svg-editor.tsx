import { useState, useMemo, useEffect, lazy } from 'react'
import { RotateCcw, Check, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import SvgDropzone from '@/components/svg-editor/svg-dropzone'
import {
    optimizeSvg, prettifySvg, extractMeta,
    toBase64Uri, toEncodedUri, toMinifiedUri,
    byteSize, toCodeSnippet, CODE_FORMAT_OPTIONS, type CodeFormat,
} from '@/components/svg-editor/svg-utils'

const SvgCodeEditor = lazy(() => import('@/components/svg-editor/SvgCodeEditor').then(m => ({ default: m.SvgCodeEditor })))

type Tab = 'preview' | 'code' | 'data-uri'

const BG_OPTIONS = [
    { label: 'Transparent', value: 'transparent', class: 'bg-[repeating-conic-gradient(#808080_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]' },
    { label: 'White', value: 'white', class: 'bg-white' },
    { label: 'Black', value: 'black', class: 'bg-black' },
    { label: 'Gray', value: 'gray', class: 'bg-zinc-800' },
]

function preparePreview(code: string): string {
    return code
        .replace(/<\?xml[\s\S]*?\?>\s*/gi, '')
        .replace(/<!--[\s\S]*?-->\s*/g, '')
        .replace(/<svg([\s\S]*?)>/i, (_, attrs) => {
            const cleaned = attrs
                .replace(/\s*\bwidth="[^"]*"/gi, '')
                .replace(/\s*\bheight="[^"]*"/gi, '')
                .replace(/\s*\bpreserveAspectRatio="[^"]*"/gi, '')
            return `<svg${cleaned} preserveAspectRatio="xMidYMid meet">`
        })
}

function downloadSvg(code: string) {
    const blob = new Blob([code], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'image.svg'
    a.click()
    URL.revokeObjectURL(url)
}

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
            <div className="pointer-events-none rounded-lg border border-border bg-muted/40 p-2.5 font-mono text-xs text-muted-foreground break-all line-clamp-3 select-all">
                {value}
            </div>
        </div>
    )
}

export default function SvgEditor() {
    const [code, setCode] = useState<string | null>(null)
    const [tab, setTab] = useState<Tab>('preview')
    const [bg, setBg] = useState('white')
    const [codeFormat, setCodeFormat] = useState<CodeFormat>('SVG')
    const [optimizedCode, setOptimizedCode] = useState('')
    const [savings, setSavings] = useState(0)
    const [displayCode, setDisplayCode] = useState('')
    const [minifiedUri, setMinifiedUri] = useState('')

    const activeCode = code ?? ''

    useEffect(() => {
        if (!code) { setOptimizedCode(''); setSavings(0); return }
        optimizeSvg(code).then(opt => {
            setOptimizedCode(opt)
            const before = new TextEncoder().encode(code).length
            const after = new TextEncoder().encode(opt).length
            setSavings(before === 0 ? 0 : Math.round((1 - after / before) * 100))
        })
    }, [code])

    useEffect(() => {
        toCodeSnippet(activeCode, codeFormat).then(setDisplayCode)
    }, [activeCode, codeFormat])

    useEffect(() => {
        if (tab !== 'data-uri') return
        toMinifiedUri(activeCode).then(setMinifiedUri)
    }, [activeCode, tab])

    const previewHtml = useMemo(() => preparePreview(activeCode), [activeCode])
    const bgClass = BG_OPTIONS.find(b => b.value === bg)?.class ?? 'bg-white'
    const meta = useMemo(() => extractMeta(activeCode), [activeCode])
    const fileSize = useMemo(() => byteSize(activeCode), [activeCode])

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
                <Button variant="outline" size="sm" onClick={() => setCode(null)}>
                    <RotateCcw className="size-3.5 mr-1.5" />
                    New SVG
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 h-140">
                {/* Left: CodeMirror editor */}
                <div className="flex flex-col gap-2 min-h-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Source</span>
                            <span className="text-xs text-muted-foreground">{fileSize}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setCode(prettifySvg(activeCode))}
                            >
                                Prettify
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setCode(optimizedCode)}
                                disabled={savings <= 0}
                            >
                                {savings > 0 ? `Optimize −${savings}%` : 'Optimize'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                title="Download SVG"
                                onClick={() => downloadSvg(activeCode)}
                            >
                                <Download className="size-3.5" />
                            </Button>
                            <CopyButton text={activeCode} />
                        </div>
                    </div>
                    <SvgCodeEditor
                        value={activeCode}
                        onChange={setCode}
                    />
                </div>

                {/* Right: tabs */}
                <div className="flex flex-col gap-2 min-h-0">
                    <div className="flex items-center gap-1 border-b border-border pb-2">
                        {(['preview', 'code', 'data-uri'] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={cn(
                                    'px-3 py-1 text-xs rounded-md transition-colors',
                                    tab === t
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                )}
                            >
                                {t === 'data-uri' ? 'Data URI' : t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>

                    {tab === 'preview' && (
                        <div className="flex flex-col gap-3 flex-1 min-h-0">
                            {/* Meta + bg picker row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {meta.viewBox && (
                                        <span className="text-xs text-muted-foreground">
                                            <span className="text-foreground/50 mr-1">viewBox</span>{meta.viewBox}
                                        </span>
                                    )}
                                    {(meta.width || meta.height) && (
                                        <span className="text-xs text-muted-foreground">
                                            <span className="text-foreground/50 mr-1">size</span>
                                            {meta.width ?? '?'} × {meta.height ?? '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {BG_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            title={opt.label}
                                            onClick={() => setBg(opt.value)}
                                            className={cn(
                                                'h-6 w-6 rounded-md border-2 transition-colors',
                                                opt.class,
                                                bg === opt.value ? 'border-primary' : 'border-border'
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className={cn('flex-1 rounded-xl relative flex items-center justify-center overflow-hidden', bgClass)}>
                                <div
                                    className="svg-preview flex items-center justify-center w-full h-full"
                                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                                />
                            </div>
                        </div>
                    )}

                    {tab === 'code' && (
                        <div className="flex flex-col gap-3 flex-1 min-h-0">
                            <div className="flex items-center justify-between">
                                <Combobox
                                    value={codeFormat}
                                    onValueChange={v => v && setCodeFormat(v as CodeFormat)}
                                    items={CODE_FORMAT_OPTIONS.map(o => o.value)}
                                    filter={null}
                                >
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

                    {tab === 'data-uri' && (
                        <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
                            <DataUriRow label="Base64" value={toBase64Uri(activeCode)} />
                            <DataUriRow label="encodeURIComponent" value={toEncodedUri(activeCode)} />
                            <DataUriRow label="Minified (encodeURIComponent)" value={minifiedUri} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    )
}
