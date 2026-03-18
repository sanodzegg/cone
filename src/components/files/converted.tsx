import { useAppStore } from "@/store/useAppStore"
import { useEffect, useState } from "react"
import type { ConvertedFile } from "@/store/useAppStore"
import { Button } from "../ui/button"
import { RefreshCcw } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B'
    return bytes < 1024 * 1024
        ? (bytes / 1024).toFixed(0) + 'KB'
        : (bytes / 1024 / 1024).toFixed(1) + 'MB'
}

export default function ConvertedFiles() {
    const convertedFiles = useAppStore(s => s.convertedFiles)
    const convertedCount = useAppStore(s => s.convertedCount)
    const convertingTotal = useAppStore(s => s.convertingTotal)
    const totalInputSize = useAppStore(s => s.totalInputSize)
    const totalOutputSize = useAppStore(s => s.totalOutputSize)
    const currentFileName = useAppStore(s => s.currentFileName)
    const resetAppState = useAppStore(s => s.reset);

    const [snapshot, setSnapshot] = useState<ConvertedFile[]>([])

    useEffect(() => {
        const incoming = Object.values(convertedFiles)
        if (incoming.length > 0) setSnapshot(incoming)
        else setSnapshot([])
    }, [convertedFiles])

    const progress = convertingTotal > 0 ? (convertedCount / convertingTotal) * 100 : 0
    const savedPercent = totalInputSize > 0 ? Math.round((1 - totalOutputSize / totalInputSize) * 100) : 0

    if (snapshot.length === 0) return null

    const handleDownload = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <section className="py-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-primary font-body text-base">Converted ({snapshot.length})</h3>
                <Tooltip>
                    <TooltipTrigger>
                        <Button onClick={resetAppState} variant={'secondary'} className={'group p-2.5! h-full!'}>
                            <RefreshCcw className="size-5 group-hover:animate-spin-once" />
                        </Button>
                        <TooltipContent>
                            <p className="text-sm font-light text-accent">Refresh Converting</p>
                        </TooltipContent>
                    </TooltipTrigger>

                </Tooltip>
            </div>
            <ul className="space-y-2.5">
                {snapshot.map((f) => (
                    <li key={f.name} className="flex items-center justify-between p-4 rounded-2xl border border-accent bg-secondary/30">
                        <span className="text-sm text-accent-foreground font-body">{f.name}</span>
                        <Button variant={'secondary'} onClick={() => handleDownload(f.blob, f.name)} className="text-xs text-primary">
                            Download
                        </Button>
                    </li>
                ))}
            </ul>

            <div className="mt-6 p-4 rounded-2xl border border-accent bg-secondary/30 space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-accent-foreground/70 truncate max-w-xs">
                        {convertedCount < convertingTotal ? `Converting ${currentFileName}` : 'Done'}
                    </span>
                    <span className="text-accent-foreground font-medium ml-4 shrink-0">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%`, background: 'linear-gradient(to right, #7c3aed, #a855f7)' }}
                    />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="rounded-xl border border-accent bg-background p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Converted</p>
                        <p className="text-2xl font-bold text-foreground">{convertedCount}</p>
                        <p className="text-xs text-muted-foreground">of {convertingTotal} files</p>
                    </div>
                    <div className="rounded-xl border border-accent bg-background p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saved</p>
                        <p className="text-2xl font-bold text-foreground">{savedPercent > 0 ? `${savedPercent}%` : '—'}</p>
                        <p className="text-xs text-muted-foreground">file size reduction</p>
                    </div>
                    <div className="rounded-xl border border-accent bg-background p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Output</p>
                        <p className="text-2xl font-bold text-foreground">{totalOutputSize > 0 ? formatBytes(totalOutputSize) : '—'}</p>
                        <p className="text-xs text-muted-foreground">from {formatBytes(totalInputSize)}</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
