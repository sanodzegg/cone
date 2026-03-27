import { useConvertStore } from "@/store/useConvertStore"
import { useEffect, useState } from "react"
import type { ConvertedFile } from "@/types"
import { Button } from "../ui/button"
import { Download, RefreshCcw } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import ConversionStats from "./conversion-stats"

export default function ConvertedFiles() {
    const convertedFiles = useConvertStore(s => s.convertedFiles)
    const failedFiles = useConvertStore(s => s.failedFiles)
    const convertedCount = useConvertStore(s => s.convertedCount)
    const convertingTotal = useConvertStore(s => s.convertingTotal)
    const totalInputSize = useConvertStore(s => s.totalInputSize)
    const totalOutputSize = useConvertStore(s => s.totalOutputSize)
    const resetAppState = useConvertStore(s => s.resetConversion);

    const [snapshot, setSnapshot] = useState<ConvertedFile[]>([])

    useEffect(() => {
        const incoming = Object.values(convertedFiles)
        if (incoming.length > 0) setSnapshot(incoming)
        else setSnapshot([])
    }, [convertedFiles])

    const failedEntries = Object.entries(failedFiles)
    const doneCount = convertedCount + failedEntries.length
    const isDone = convertingTotal > 0 && doneCount >= convertingTotal
    const progress = convertingTotal > 0 ? (doneCount / convertingTotal) * 100 : 0
    const quality = useConvertStore(s => s.quality)
    const imageFiles = snapshot.filter(f => f.engineId === 'image')
    const imageInputSize = imageFiles.reduce((acc, f) => acc + f.inputSize, 0)
    const imageOutputSize = imageFiles.reduce((acc, f) => acc + f.blob.size, 0)
    const savedPercent = isDone && imageFiles.length > 0 && imageInputSize > 0
        ? Math.round((1 - imageOutputSize / imageInputSize) * 100)
        : null
    const hasSameFormatReencode = quality >= 70 && imageFiles.some(f => f.sourceFormat === f.format)
    const hasHighSavingsAtHighQuality = quality >= 80 && savedPercent !== null && savedPercent > 50
    const hasSuspiciousSavings = savedPercent !== null && (hasSameFormatReencode || hasHighSavingsAtHighQuality)
    const suspiciousReason = hasSameFormatReencode
        ? 'Some files were re-encoded to the same format. Savings come from metadata removal and compression re-optimization, not quality loss.'
        : 'Savings above 50% at high quality are unusual. This likely means the originals had heavy metadata or inefficient encoding — not quality loss.'

    if (convertingTotal === 0) return null

    const handleDownload = (blob: Blob, name: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
    }

    const downloadAll = async () => {
        if (snapshot.length === 0) return
        if (snapshot.length === 1) {
            handleDownload(snapshot[0].blob, snapshot[0].name)
            return
        }
        const JSZip = (await import('jszip')).default
        const zip = new JSZip()
        for (const f of snapshot) {
            zip.file(f.name, f.blob)
        }
        const blob = await zip.generateAsync({ type: 'blob' })
        handleDownload(blob, 'converted.zip')
    }

    return (
        <section className="py-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-primary font-body text-base">
                    Converted ({snapshot.length}){failedEntries.length > 0 && <span className="text-destructive ml-2">· {failedEntries.length} failed</span>}
                </h3>
                <div className="flex items-center gap-x-2">
                    <Button onClick={downloadAll} disabled={!isDone} variant={'secondary'} className={'group p-2.5! h-full!'}>
                        <Download className="size-5" />
                    </Button>
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
            </div>
            {snapshot.length > 0 && (
                <ul className="space-y-2.5">
                    {snapshot.map((f) => (
                        <li key={f.name} className="flex items-center justify-between p-4 rounded-2xl border border-accent bg-secondary/30">
                            <div className="flex items-center gap-2 min-w-0">
                                <Tooltip>
                                    <TooltipTrigger>
                                        <span className="text-sm text-accent-foreground font-body truncate cursor-default">{f.name}</span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{f.name}</p></TooltipContent>
                                </Tooltip>
                                {f.customized && (
                                    <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-md bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 border border-yellow-400/30">
                                        Modified
                                    </span>
                                )}
                            </div>
                            <Button variant="secondary" onClick={() => handleDownload(f.blob, f.name)} className="text-xs text-primary ml-2 shrink-0">
                                <Download className="size-3.5 mr-1" />
                                Download
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            <ConversionStats
                isDone={isDone}
                progress={progress}
                convertedCount={convertedCount}
                convertingTotal={convertingTotal}
                savedPercent={savedPercent}
                hasSuspiciousSavings={hasSuspiciousSavings}
                suspiciousReason={suspiciousReason}
                totalOutputSize={totalOutputSize}
                totalInputSize={totalInputSize}
            />
        </section>
    )
}
