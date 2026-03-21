import { formatBytes } from './format-bytes'
import type { ConvertedFile } from './use-bulk-converter'

interface Props {
  files: ConvertedFile[]
}

export function BulkSummary({ files }: Props) {
  const succeeded = files.filter(f => f.ok)
  const failed = files.filter(f => !f.ok)
  const totalOriginal = succeeded.reduce((a, f) => a + (f.originalSize ?? 0), 0)
  const totalConverted = succeeded.reduce((a, f) => a + (f.convertedSize ?? 0), 0)
  const totalSaved = totalOriginal - totalConverted
  const pct = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0

  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-border bg-secondary/20 p-3 text-center">
        <p className="text-lg font-semibold text-foreground">{succeeded.length}</p>
        <p className="text-[10px] text-muted-foreground">Converted</p>
      </div>
      <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
        <p className="text-lg font-semibold text-green-500">{formatBytes(totalSaved)}</p>
        <p className="text-[10px] text-muted-foreground">Saved</p>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-3 text-center">
        <p className="text-lg font-semibold text-foreground">{pct}%</p>
        <p className="text-[10px] text-muted-foreground">Reduction</p>
      </div>
      {failed.length > 0 && (
        <div className="col-span-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center">
          <p className="text-sm font-medium text-destructive">{failed.length} failed</p>
        </div>
      )}
    </div>
  )
}
