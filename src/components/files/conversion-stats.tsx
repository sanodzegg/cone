import { formatBytes } from "@/utils/fileUtils"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { HelpCircle } from "lucide-react"
import { useTheme } from "../theme/theme-provider"


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
    const { theme } = useTheme()
    return (
        <div className="mt-6 2xl:mt-8 p-4 2xl:p-5 rounded-2xl border border-accent bg-secondary/30 space-y-3 2xl:space-y-4">
            <div className="flex items-center justify-between text-sm 2xl:text-base">
                <span className="text-accent-foreground/70 truncate max-w-xs cursor-default">
                    {isDone ? 'Done' : 'Converting…'}
                </span>
                <span className="text-accent-foreground font-medium ml-4 shrink-0">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 2xl:h-2.5 w-full rounded-full bg-accent overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: `${theme === 'dark' ? 'linear-gradient(to right, #7c3aed, #a855f7)' : 'black'}` }}
                />
            </div>
            <div className="grid grid-cols-3 gap-3 2xl:gap-4 pt-1">
                <div className="rounded-xl border border-accent bg-background p-3 2xl:p-4">
                    <p className="text-xs 2xl:text-sm text-muted-foreground uppercase tracking-wider mb-1">Converted</p>
                    <p className="text-2xl 2xl:text-3xl font-bold text-foreground">{convertedCount}</p>
                    <p className="text-xs 2xl:text-sm text-muted-foreground">of {convertingTotal} files</p>
                </div>
                <div className="rounded-xl border border-accent bg-background p-3 2xl:p-4">
                    <div className="flex items-center gap-1 mb-1">
                        <p className="text-xs 2xl:text-sm text-muted-foreground uppercase tracking-wider">Saved</p>
                        {hasSuspiciousSavings && (
                            <Tooltip>
                                <TooltipTrigger className="cursor-help">
                                    <HelpCircle className="size-3 2xl:size-3.5 text-muted-foreground shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64 text-center">
                                    <p className="text-sm 2xl:text-base">{suspiciousReason}</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <p className={`text-2xl 2xl:text-3xl font-bold ${savedPercent !== null && savedPercent < 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {savedPercent !== null ? (savedPercent < 0 ? `+${-savedPercent}%` : `${savedPercent}%`) : '—'}
                    </p>
                    <p className="text-xs 2xl:text-sm text-muted-foreground">{savedPercent !== null && savedPercent < 0 ? 'size increase' : 'file size reduction'}</p>
                </div>
                <div className="rounded-xl border border-accent bg-background p-3 2xl:p-4">
                    <p className="text-xs 2xl:text-sm text-muted-foreground uppercase tracking-wider mb-1">Output</p>
                    <p className="text-2xl 2xl:text-3xl font-bold text-foreground">{totalOutputSize > 0 ? formatBytes(totalOutputSize) : '—'}</p>
                    <p className="text-xs 2xl:text-sm text-muted-foreground">from {formatBytes(totalInputSize)}</p>
                </div>
            </div>
        </div>
    )
}
