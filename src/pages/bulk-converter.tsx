import { FolderOpen, Play, Eye, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBulkConverter } from '@/components/bulk-converter/use-bulk-converter'
import { BulkSettings } from '@/components/bulk-converter/bulk-settings'
import { BulkFileRow } from '@/components/bulk-converter/bulk-file-row'
import { BulkSummary } from '@/components/bulk-converter/bulk-summary'

export default function BulkConverter() {
  const { state, pickFolder, startConvert, toggleWatch, reset, setSetting } = useBulkConverter()

  const isRunning = state.status === 'converting'
  const hasDone = state.status === 'done' || state.files.length > 0
  const progressPct = state.progress.total > 0
    ? Math.round((state.progress.done / state.progress.total) * 100)
    : 0

  return (
    <section className="section py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-body font-semibold text-foreground">Bulk Converter</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Convert all images in a folder recursively. Watch for new files automatically.
          </p>
        </div>
        {(state.folderPath || hasDone) && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 shrink-0">
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left: settings + controls */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Folder picker */}
          <div
            onClick={isRunning ? undefined : pickFolder}
            className={cn(
              'rounded-xl border border-dashed border-border p-4 transition-colors',
              !isRunning && 'cursor-pointer hover:border-primary/50 hover:bg-accent/50'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="size-4 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">
                {state.folderPath ? 'Folder' : 'Pick a folder'}
              </p>
            </div>
            {state.folderPath ? (
              <>
                <p className="text-[10px] text-muted-foreground truncate">{state.folderPath}</p>
                {state.status === 'scanning' ? (
                  <p className="text-[10px] text-primary mt-1">Scanning…</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-1">{state.scannedCount} images found</p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">Click to open folder picker</p>
            )}
          </div>

          {/* Settings */}
          <BulkSettings state={state} setSetting={setSetting} disabled={isRunning} />

          {/* Action buttons */}
          {state.folderPath && state.scannedCount > 0 && (
            <div className="space-y-2 pt-1">
              <Button
                className="w-full gap-2"
                size="sm"
                onClick={startConvert}
                disabled={isRunning}
              >
                {isRunning ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Converting…</>
                ) : (
                  <><Play className="size-3.5" /> Convert {state.scannedCount} files</>
                )}
              </Button>

              <Button
                variant="outline"
                className={cn('w-full gap-2', state.watching && 'border-primary text-primary')}
                size="sm"
                onClick={toggleWatch}
                disabled={isRunning}
              >
                <Eye className="size-3.5" />
                {state.watching ? 'Watching…' : 'Watch folder'}
              </Button>
            </div>
          )}
        </div>

        {/* Right: results */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Progress bar */}
          {(isRunning || state.status === 'done') && state.progress.total > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{isRunning ? 'Converting…' : 'Done'}</span>
                <span>{state.progress.done} / {state.progress.total} ({progressPct}%)</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary stats */}
          {state.files.length > 0 && <BulkSummary files={state.files} />}

          {/* File list */}
          {state.files.length > 0 ? (
            <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">
                  {state.watching ? 'Live results' : 'Results'}
                </p>
                {state.watching && (
                  <span className="flex items-center gap-1.5 text-[10px] text-green-500">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="px-4 max-h-105 overflow-y-auto">
                {state.files.map(f => (
                  <BulkFileRow key={f.id} file={f} />
                ))}
              </div>
            </div>
          ) : !state.folderPath ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border text-center gap-2">
              <FolderOpen className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Pick a folder to get started</p>
            </div>
          ) : state.scannedCount === 0 && state.status !== 'scanning' ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border text-center gap-2">
              <p className="text-sm text-muted-foreground">No images found in this folder</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border text-center gap-2">
              <p className="text-sm text-muted-foreground">
                {state.scannedCount} images ready — configure settings and click Convert
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
