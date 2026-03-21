import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBytes } from './format-bytes'
import type { ConvertedFile } from './use-bulk-converter'

interface Props {
  file: ConvertedFile
}

export function BulkFileRow({ file }: Props) {
  const saved = file.savedBytes ?? 0
  const pct = file.originalSize ? Math.round((saved / file.originalSize) * 100) : 0
  const name = file.srcPath?.split('/').pop() ?? file.srcPath ?? ''

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      {file.ok ? (
        <CheckCircle2 className="size-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="size-4 text-destructive shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{name}</p>
        {file.ok ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{formatBytes(file.originalSize ?? 0)}</span>
            <ArrowRight className="size-2.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">{formatBytes(file.convertedSize ?? 0)}</span>
          </div>
        ) : (
          <p className="text-[10px] text-destructive truncate">{file.error}</p>
        )}
      </div>

      {file.ok && (
        <div className="shrink-0 text-right">
          <span className={cn(
            'text-xs font-medium',
            saved > 0 ? 'text-green-500' : saved < 0 ? 'text-amber-500' : 'text-muted-foreground'
          )}>
            {saved > 0 ? `-${formatBytes(saved)}` : saved < 0 ? `+${formatBytes(-saved)}` : '±0'}
          </span>
          <p className={cn(
            'text-[10px]',
            saved > 0 ? 'text-green-500/70' : 'text-muted-foreground'
          )}>
            {saved > 0 ? `-${pct}%` : saved < 0 ? `+${Math.abs(pct)}%` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
