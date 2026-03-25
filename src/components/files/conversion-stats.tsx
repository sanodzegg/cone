import { formatBytes } from "@/utils/fileUtils"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { HelpCircle } from "lucide-react"


interface ConversionStatsProps {
    isDone: boolean
    progress: number
    convertedCount: number
    convertingTotal: number
    savedPercent: number | null
    hasSuspiciousSavings: boolean
    suspiciousReason?: string
    totalOutputSize: number
    totalInputSize: number
}

export default function ConversionStats({
    isDone,
    progress,
    convertedCount,
    convertingTotal,
    savedPercent,
    hasSuspiciousSavings,
    suspiciousReason,
    totalOutputSize,
    totalInputSize,
}: ConversionStatsProps) {
    return (
        <div className="mt-6 p-4 rounded-2xl border border-accent bg-secondary/30 space-y-3">
            <div className="flex items-center justify-between text-sm">
                <Tooltip>
                    <TooltipTrigger>
                        <span className="text-accent-foreground/70 truncate max-w-xs cursor-default">
                            {isDone ? 'Done' : 'Converting…'}
                        </span>
                    </TooltipTrigger>
                </Tooltip>
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
                    <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Saved</p>
                        {hasSuspiciousSavings && (
                            <Tooltip>
                                <TooltipTrigger className="cursor-help">
                                    <HelpCircle className="size-3 text-muted-foreground shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64 text-center">
                                    <p>{suspiciousReason}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-foreground">{savedPercent !== null && savedPercent > 0 ? `${savedPercent}%` : '—'}</p>
                    <p className="text-xs text-muted-foreground">file size reduction</p>
                </div>
                <div className="rounded-xl border border-accent bg-background p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Output</p>
                    <p className="text-2xl font-bold text-foreground">{totalOutputSize > 0 ? formatBytes(totalOutputSize) : '—'}</p>
                    <p className="text-xs text-muted-foreground">from {formatBytes(totalInputSize)}</p>
                </div>
            </div>
        </div>
    )
}
